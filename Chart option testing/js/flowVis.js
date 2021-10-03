

// Custom materials flow visualisation
const visualisations = {
    flow:   {
        methods:    {},
    }
}

const flowVisSettings = {
    dates: {
        from:   '30/6/2020',  // Write as end of month as all data is timestamped at the first of the month
        to:     '30/9/2020'
    },
    dims: {
        height: 1200, 
        width: 1920,
        margin: {
            top: 200, right: 100, bottom: 100, left: 100
        },
        linkSpacing: 15
    },    
    sources:    ['Paper and paperboard', 'Glass', 'Plastic', 'Metal', 'Contamination'],
    targets:    ['Local reprocessing', 'Storage', 'Export', 'Landfill'],
    geometry: {
        nodeGroupPos: {
            sources: {x: 315,   offset: 350},   
            targets: {x: 1550,  offset: -350},
        }
    },
    nodePos: {
        source: {},
        target: {},
    },
    linkPos: {
    },
    palette: {
        'local-reprocessing':       'var(--chartDarkGreen)',     // Otways green
        'export':                   'var(--chartTeal',     // surfCoastTeal
        'landfill':                 'var(--chartGray)',     // corrangamiteEggplant
        'paper-and-paperboard':     'var(--chartYellow)',     // gannarawwaPinkLight
        'glass':                    'var(--chartPurple)',     // corrangamiteEggplantLight
        'plastic':                  'var(--campaign_gannarawwaPinkLight)',     
        'metal':                    'var(--campaign_queenscliffeMarineLight)',    
        'contamination':            'var(--chartOrange)',     
    }
}


visualisations.flow.methods.renderFlowVis = async (data, svgID, settings) => {

    //------------ 0. RECORD DATA AND SETTINGS ------------//
    visualisations.flow[svgID]  = {
        settings:           settings,
        state:  {
            circularFlow:   false,
            isometric:      false,
            event:          false,
            icons:          false,
        }
    }

    //------------ 1. SETUP SVG LAYERS AND SHAPE GENERATORS ------------//
        const vis = d3.select(`#${svgID}`)
                .attr('viewBox', `0 0 ${settings.dims.width} ${settings.dims.height}`)
                .classed('figure fullpage svg-content', true)
                .attr('preserveAspectRatio', 'xMidYMid meet'),
            defs = vis.append('defs'),
            linkLayer = vis.append('g').classed('links-group layer', true),
            nodeLayer = vis.append('g').classed('node-group layer', true),
            annotationLayer = vis.append('g').classed('annotation-group layer', true),
                annotationLinkLayer = annotationLayer.append('g').classed('annotation-linkPaths' , true ), 
                nodeLabels = annotationLayer.append('g').classed('annotation-nodeLabels' , true ),
                linkLabels = annotationLayer.append('g').classed('annotation-linkLabels' , true ),
                titleLayer = annotationLayer.append('g').classed('annotation-titleLabels' , true ),
                directionLayer = annotationLayer.append('g').classed('annotation-direction' , true ),
                illustrationLayer = vis.append('g').classed('illustration-layer' , true )
            generators = {
                straight: 				d3.line().x( d => d.x ).y( d => d.y ),
                linkVertical: 			d3.linkVertical(),
                linkHorizontal: 		d3.linkHorizontal(),
                circleClockwise: 		(orginObj, radius) => "M "+(orginObj.x+radius)+","+orginObj.y +" m 0,0  a "+radius+","+radius+" 0 0 1 "+(-radius * 2)+",0 a "+radius+","+radius+" 0 0 1 "+(radius * 2)+",0" ,
                circleAntiClockwise: 	(orginObj, radius) => "M "+(orginObj.x-radius)+","+orginObj.y +" m 0,0  a "+radius+","+radius+" 0 1 0 "+(radius * 2)+",0 a "+radius+","+radius+" 0 1 0 "+(-radius * 2)+",0" 			
            }


    //------------  2. DATA PREPARATION | FILTER DATA FOR CHARTING AND DATE BOUNDARY ------------//
        const chartData = data.filter(d => 
            +d.date > +helpers.numberParsers.parseDateSlash(flowVisSettings.dates.from) &&
            +d.date < +helpers.numberParsers.parseDateSlash(flowVisSettings.dates.to)
        )

    //------------ 3. SETUP SVG DEFS (GRADIENTS) ------------//
        // a. Group label gradient fills
        const collectionGradient = defs.append('linearGradient').attr('id', 'collection-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%')
                .attr('y1', '25%')
                .attr('y2', '0%')

        settings.sources.forEach((source, i) => {
            const sourceClassname = helpers.slugify(source),
                colour = settings.palette[sourceClassname],
                offset = 100 / (settings.sources.length-1) * i
            collectionGradient.append('stop')
                .attr('offset', Math.round(offset*10)/10+'%')
                .attr('stop-color', colour)
        })
        
        const destinationGradient = defs.append('linearGradient').attr('id', 'destination-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%')
                .attr('y1', '25%')
                .attr('y2', '0%')

        settings.targets.filter(d=> d !== 'Storage').forEach((target, i) => {
            const targetsClassname = helpers.slugify(target),
                colour = settings.palette[targetsClassname],
                offset = 100 / (settings.targets.filter(d=> d !== 'Storage').length-1) * i

            destinationGradient.append('stop')
                .attr('offset', Math.round(offset*10)/10+'%')
                .attr('stop-color', colour)
        })

        const recycledGradient = defs.append('linearGradient').attr('id', 'recycling-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%')
                .attr('y1', '25%')
                .attr('y2', '0%'),
            nodeArray = settings.sources.concat(settings.targets.filter(d=> d !== 'Storage'))

        nodeArray.forEach((node, i) => {
            const className = helpers.slugify(node),
                colour = settings.palette[className],
                offset = 100 / (nodeArray.length-1) * i

            recycledGradient.append('stop')
                .attr('offset', Math.round(offset*10)/10+'%')
                .attr('stop-color', colour)
        })

    //------------  4. SCALES | GET NODE SIZES AND DATA FOR SCALES  ------------//
        const sources = [...new Set(chartData.map(d => d.source))],
            targets = [...new Set(chartData.map(d => d.target))],
            sourceNodeSize = sources.map( source => {
                return { [source]:  d3.sum(chartData.filter(d=> d.source === source).map(d => d.value)) }
            }),
            targetNodeSize = targets.map( target => {
                return { [target]:  d3.sum(chartData.filter(d=> d.target === target).map(d => d.value)) }
            }),
            maxNode = d3.max(sourceNodeSize.map(d => Object.values(d)[0]).concat(targetNodeSize.map(d => Object.values(d)[0]))),
            minNode = d3.min(sourceNodeSize.map(d => Object.values(d)[0]).concat(targetNodeSize.map(d => Object.values(d)[0]))),
            maxLink = d3.max(chartData.map(d => d.value)),
            sourceNodeTotal = d3.sum(sourceNodeSize.map(d=> Object.values(d)[0]))

        settings.scales = {
            nodeRadScale:           d3.scaleSqrt().domain([0, maxNode]).range([10, 100]),
            linkScale:              d3.scaleLinear().domain([0, maxLink]).range([1, maxLink/maxNode * 100]),
            nodeCircularLabelScale: d3.scaleLinear().domain([0, maxNode]).range([20, 30]),
            nodeLabelScale:         d3.scaleSqrt().domain([0, maxNode]).range([10, 40]),
            nodeArrowScale:         d3.scaleLinear().domain([0, maxNode]).range([1.25, 8]),
            nodeUnitLabelScale:     d3.scaleSqrt().domain([0, maxNode]).range([8, 22]),
            nodeUnitOffsetScale:    d3.scaleSqrt().domain([0, maxNode]).range([10, 32])
        }

    //--------- 5. NODE-LINK POSITIONING + APPEND NODES & LABELS| Set master node points for sources and append nodes and node labels ------------//
        let currentSourceY = settings.dims.margin.top + 140
        sourceNodeSize.forEach( obj => {
            const label = Object.keys(obj)[0], value = Object.values(obj)[0],
                radius = settings.scales.nodeRadScale(value),
                xPos = settings.geometry.nodeGroupPos.sources.x,
                yPos =  currentSourceY + radius   // radius of current circle
            // Append node
            nodeLayer.append('circle')
                .classed('collection node '+helpers.slugify(label), true)
                .datum({ label: label, value: value })
                .attr('r', radius)
                .attr('cx', xPos)
                .attr('cy', yPos)
                .on('mouseover', nodeMouseover)
                .on('mouseout', nodeMouseout)

            // Append circular node label
            const nodeLabel = nodeLabels.append('g').classed('nodeLabel-group', true)
                nodeLabel.append('path').attr('id', `${helpers.slugify(label)}-labelPath`)
                    .classed('nodeLabelPath', true)
                    .attr('d', generators.circleClockwise({x: xPos, y: yPos}, radius + 8 ) )
            nodeLabel.append('text').attr('id', `${helpers.slugify(label)}-label`)
                .classed(`nodeLabel collection textOnPath source ${helpers.slugify(label)}`, true)
                .append('textPath').attr("xlink:href", `#${helpers.slugify(label)}-labelPath`)				
                    .attr('startOffset',  	'75%') 
                    .style('text-anchor',  'middle')    //place the text halfway on the arc
                    .style('letter-spacing', 0)         
                    .style('font-size', settings.scales.nodeCircularLabelScale(value) )
                    .text(label)

            // Append total label
            const totalLabel = nodeLabels.append('g')
                .classed(`node-label-centered ${helpers.slugify(label)}`, true)
                .attr('transform', `translate(${xPos}, ${yPos})`)
            totalLabel.append('text')
                .classed('source label node', true)
                .style('font-size', settings.scales.nodeLabelScale(value))
                .html(helpers.numberFormatters.formatComma(value) )
            totalLabel.append('text')
                .classed('source label node unit', true)
                .style('font-size', settings.scales.nodeUnitLabelScale(value))
                .attr('dy', settings.scales.nodeUnitOffsetScale(value))
                .html('tonnes' )

            // Append node direction arrows
            // const nodeArrow = totalLabel.append('g')
            //     .classed(`node-arrow-group ${helpers.slugify(label)}`, true)
            // nodeArrow.append('path').classed('node-arrow upper', true)
            //     .attr('d', 'M-.132-1.892v1.879h-6.483v1.905h13.23z')  
            //     .attr('transform', `translate(0, -${radius * 0.6}) scale(${settings.scales.nodeArrowScale(value)})`)
            // nodeArrow.append('path').classed('node-arrow lower', true)
            //     .attr('d', 'M-.132 1.892V.013h-6.483v-1.905h13.23z')  
            //     .attr('transform', `translate(0, ${radius * 0.6}) scale(${settings.scales.nodeArrowScale(value)})`)

            settings.nodePos.source[label] = {x: xPos, y: yPos, radius: radius, volume: value}
            currentSourceY = yPos + settings.scales.nodeRadScale(value) + 40 // add radius of prior circle + buffer
        })

        let currentTargetY = settings.dims.margin.top + 180
        targetNodeSize.forEach( obj => {
            const label = Object.keys(obj)[0], value = Object.values(obj)[0],
                radius = settings.scales.nodeRadScale(value),
                xPos = settings.geometry.nodeGroupPos.targets.x,
                yPos =  currentTargetY + settings.scales.nodeRadScale(value),   // radius of current circle
                node = nodeLayer.append('circle')
                        .classed('destination node '+helpers.slugify(label), true)
                        .datum({ label: label,  value: value })
                        .attr('r', radius)
                        .attr('cx', xPos)
                        .attr('cy', yPos)
                        .on('mouseover', nodeMouseover)
                        .on('mouseout', nodeMouseout)
            // Append circular node label
            const nodeLabel = nodeLabels.append('g').classed('nodeLabel-group', true)
            nodeLabel.append('path').attr('id', `${helpers.slugify(label)}-labelPath`)
                .classed('nodeLabelPath', true)
                .attr('d', generators.circleClockwise({x: xPos, y: yPos}, radius + 8 ) )
            nodeLabel.append('text').attr('id', `${helpers.slugify(label)}-label`)
                .classed(`nodeLabel destination textOnPath target ${helpers.slugify(label)}`, true)
                .append('textPath').attr("xlink:href", `#${helpers.slugify(label)}-labelPath`)				
                    .attr('startOffset',  	'75%') 
                    .style('text-anchor',   'middle') 
                    .style('letter-spacing', 0) 
                    .style('font-size', settings.scales.nodeCircularLabelScale(value) )
                    .text(label)
            // Add 'and storage' to local processing
            if(label=== 'Local reprocessing'){
                const nodeLabel2 = nodeLabels.append('g').classed('nodeLabel-group', true)
                nodeLabel2.append('path').attr('id', `${helpers.slugify(label)}-labelPath-2`)
                    .classed('nodeLabelPath', true)
                    .attr('d', generators.circleAntiClockwise({x: xPos, y: yPos}, radius + 20 ) )
                    .attr('transform', 'translate(0, 5)') 
                nodeLabel2.append('text').attr('id', `${helpers.slugify(label)}-label-2`)
                    .classed(`nodeLabel destination textOnPath target ${helpers.slugify(label)}`, true)
                    .append('textPath').attr("xlink:href", `#${helpers.slugify(label)}-labelPath-2`)				
                        .attr('startOffset',  	'25%') 
                        .style('text-anchor',   'middle') 
                        .style('letter-spacing', 1.5) 
                        .style('font-size', settings.scales.nodeCircularLabelScale(value) )
                        .text('and storage')
            }

            // Append total label
            const totalLabel = nodeLabels.append('g')
                .classed(`node-label-centered ${helpers.slugify(label)}`, true)
                .attr('transform', `translate(${xPos}, ${yPos})`)
            totalLabel.append('text')
                .classed('target label node', true)
                .style('font-size', settings.scales.nodeLabelScale(value))
                .html(helpers.numberFormatters.formatComma(value) )
            totalLabel.append('text')
                .classed('target label node unit', true)
                .style('font-size', settings.scales.nodeUnitLabelScale(value) )
                .attr('dy', settings.scales.nodeUnitOffsetScale(value))
                .html('tonnes' )

            settings.nodePos.target[label] = {x: xPos, y: yPos, radius: radius}
            currentTargetY = yPos + settings.scales.nodeRadScale(value) + 100 // add radius of prior circle + buffer
        })    


    //---------------------- 6. RENDER LINKS -------------------//
        // a. Find link thickness at each source and target node to calculate spacing at each source/target node
        Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
            settings.linkPos[source] = []
            Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
                const linkTotal = d3.sum(chartData.filter(d => d.source === source && d.target=== target).map(d => d.value))
                settings.linkPos[source].push({connection: target, value: linkTotal, linkWidth: settings.scales.linkScale(linkTotal)})
            })
        })

        Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
            settings.linkPos[target] = []
            Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
                const linkTotal = d3.sum(chartData.filter(d => d.source === source && d.target=== target).map(d => d.value))
                settings.linkPos[target].push({connection: source, value: linkTotal, linkWidth: settings.scales.linkScale(linkTotal)})
            })
        })

        // b. Determine link spacing at each node (i.e. start/end points for links)
        Object.entries(settings.linkPos).forEach(([node, connectionObj ]) => {
            const totalLinks = connectionObj.length,
                connectorWidths = connectionObj.map(d => d.linkWidth),
                cumWidths = cumsum(connectorWidths),
                connectorSpacing = cumWidths.map((d, i, array) => i === 0 ? connectorWidths[i] / 2 : connectorWidths[i] / 2 + array[i-1] + settings.dims.linkSpacing * i),
                totalConnectorSpan = d3.sum(connectorWidths) + settings.dims.linkSpacing * (connectorWidths.length -1)

            connectionObj.forEach((linkObj, i) => {
                linkObj.dx = 0
                linkObj.dy = connectorSpacing[i] -  totalConnectorSpan / 2
            })
        })

        // c. Append the links themselves, as well as set up labelling / animation pathways
        let currentReturnX1 = settings.geometry.nodeGroupPos.targets.x + 150, 
            currentReturnX0 = settings.geometry.nodeGroupPos.sources.x - 100,
            currentReturnY = 200 ,
            returnCurveRadius = 10,
            landfillArrowXEnd = settings.geometry.nodeGroupPos.targets.x + 150,
            currentContaminationReturnX = settings.geometry.nodeGroupPos.targets.x + 150
            currentContaminationReturnYOffset = 0

        Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
            Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
                const total = d3.sum(chartData.filter(d => d.source === source && d.target=== target).map(d => d.value)),
                    sourcePosObj = settings.linkPos[source].filter(d=> d.connection === target)[0],
                    targetPosObj = settings.linkPos[target].filter(d=> d.connection === source)[0],
                    nodeStart    = [sourceNode.x + sourcePosObj.dx, sourceNode.y + sourcePosObj.dy],
                    linkOffset1  = [sourceNode.x + sourcePosObj.dx + settings.geometry.nodeGroupPos.sources.offset, sourceNode.y + sourcePosObj.dy],
                    nodeEnd      = [targetNode.x + targetPosObj.dx, targetNode.y + targetPosObj.dy],
                    linkOffset2  = [targetNode.x + targetPosObj.dx + settings.geometry.nodeGroupPos.targets.offset, targetNode.y + targetPosObj.dy],
                    points       = {source: linkOffset1, target: linkOffset2},
                    linkPath     = `M${nodeStart[0]},${nodeStart[1]} L${generators.linkHorizontal(points).slice(1)}  L${nodeEnd[0]},${nodeEnd[1]} `

                // i. Source to target link (add link as part of group with gradient)
                const linkGroup = linkLayer.append('g').classed('link-group', true),
                    gradient = linkGroup.append("linearGradient")
                        .attr("id", `${helpers.slugify(source)}_link_${helpers.slugify(target)}`)
                        .attr("gradientUnits", "userSpaceOnUse")
                        .attr("x1", nodeStart[0])
                        .attr("x2", nodeEnd[0])
                    // Gradient at start of path (the collection / 'source')
                    gradient.append("stop")
                        .attr("offset", "0%")
                        .attr("stop-color", settings.palette[helpers.slugify(source)]);
                    // Gradient at end of path (the destination / 'target')
                    gradient.append("stop")
                        .attr("offset", "100%")
                        .attr("stop-color", settings.palette[helpers.slugify(target)]);

                linkGroup.append('path')
                    .attr('id', `${helpers.slugify(source)}__${helpers.slugify(target)}`)
                    .classed(`link collection_destination ${helpers.slugify(source)} ${helpers.slugify(target)}` , true)
                    .attr('d', linkPath)
                    .attr('source', source)
                    .attr('target', target)
                    .attr('volume', total)
                    .attr('stroke', `url(#${helpers.slugify(source)}_link_${helpers.slugify(target)})`)
                    .style('stroke-width', settings.scales.linkScale(total))

                // ii. Source to target annotation path
                annotationLinkLayer.append('path')
                    .attr('id', `annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`)
                    .classed(`annotationPath ${helpers.slugify(source)} ${helpers.slugify(target)} hidden` , true)
                    .attr('d', linkPath)

                /// iii. Source side label (% of source) and volume into MRF
                const sourcelinkLabel = linkLabels.append('g').classed(`linkLabel textOnPath destination-colour ${helpers.slugify(source)} ${helpers.slugify(target)}`, true)
                        .attr('transform', 'translate(0, 5)')
                    targetlinkLabel = linkLabels.append('g').classed(`linkLabel textOnPath collection-colour ${helpers.slugify(source)} ${helpers.slugify(target)}`, true)
                        .attr('transform', 'translate(0, 5)'), 
                    linkLength = document.getElementById(`annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`).getTotalLength(),
                    sourceLabel = total === 0 ? `→ No collected ${source.toLowerCase()} sent to ${target.toLowerCase()}`
                        : `→ ${helpers.numberFormatters.formatPct1dec(total/sourceNode.volume)} of collected ${source.toLowerCase()} sent to ${target.toLowerCase()}`,
                    targetLabel = total === 0 ? `No ${source.toLowerCase()} received →`
                        : `${helpers.numberFormatters.formatComma(total)} tonnes of ${source.toLowerCase()} received →`

                sourcelinkLabel.append('text').attr('id', `sourceLabel-${helpers.slugify(source)}__${helpers.slugify(target)}`)
                    .append('textPath').attr("xlink:href", `#annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`)				
                        .attr('startOffset',  sourceNode.radius + 20) 
                        .style('text-anchor',  'start') 
                        .style('letter-spacing', 0) 
                        .text(sourceLabel)
                targetlinkLabel.append('text').attr('id', `targetLabel-${helpers.slugify(source)}__${helpers.slugify(target)}`)
                    .append('textPath').attr("xlink:href", `#annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`)				
                        .attr('startOffset',  linkLength - (targetNode.radius + 10)	) 
                        .style('text-anchor',   'end') 
                        .style('letter-spacing', 0) 
                        .text(targetLabel)

                // iv. Target to source "return" and to contamination link
                if(target.toLowerCase() !== 'landfill' && source.toLowerCase() !== 'contamination'){
                    // a. Adjust for current line thickness (half link thickness)
                    currentReturnX1 += (settings.scales.linkScale(total)/2)
                    currentReturnX0 -= (settings.scales.linkScale(total)/2)
                    currentReturnY  -= (settings.scales.linkScale(total)/2)
                    // b. Create link path
                    const returnLinkPath = `M${nodeEnd[0]},${nodeEnd[1]} 
                                            L${currentReturnX1},${nodeEnd[1]}                                 
                                            q${returnCurveRadius},0 ${returnCurveRadius},${-returnCurveRadius}  
                                            L${currentReturnX1+returnCurveRadius}, ${currentReturnY}
                                            q0,${-returnCurveRadius} ${-returnCurveRadius},${-returnCurveRadius}  
                                            L${currentReturnX0}, ${currentReturnY-returnCurveRadius}
                                            q${-returnCurveRadius},0 ${-returnCurveRadius},${returnCurveRadius}  
                                            L${currentReturnX0-returnCurveRadius}, ${nodeStart[1]-returnCurveRadius}
                                            q0,${returnCurveRadius} ${returnCurveRadius},${returnCurveRadius}
                                            L${nodeStart[0]}, ${nodeStart[1]}`
                    // c. Add link as part of group with gradient
                    const linkGroup = linkLayer.append('g').classed('return-link-group', true),                
                        gradient = linkGroup.append("linearGradient")
                            .attr("id", `${helpers.slugify(target)}_link_${helpers.slugify(source)}`)
                            .attr("gradientUnits", "userSpaceOnUse")
                            .attr("x1", nodeEnd[0])
                            .attr("x2", nodeStart[0])
                    // Gradient at start of path (the destination / 'target')
                    gradient.append("stop")
                        .attr("offset", "0%")
                        .attr("stop-color", settings.palette[helpers.slugify(target)]);
                    // Gradient at end of path (the collection / 'source')
                    gradient.append("stop")
                        .attr("offset", "100%")
                        .attr("stop-color", settings.palette[helpers.slugify(source)]);

                    linkGroup.append('path')
                        .datum({value: total})
                        .attr('id', `${helpers.slugify(source)}__${helpers.slugify(target)}`)
                        .classed(`link destination_collection ${helpers.slugify(source)} ${helpers.slugify(target)} return` , true)
                        .attr('d', returnLinkPath)
                        .attr('source', target)
                        .attr('target', source)
                        .attr('volume', total)
                        .attr('stroke', `url(#${helpers.slugify(target)}_link_${helpers.slugify(source)})`)
                        .style('stroke-width', settings.scales.linkScale(total))

                    annotationLinkLayer.append('path')
                        .attr('id', `annotationPath-${helpers.slugify(target)}__${helpers.slugify(source)}`)
                        .classed(`annotationPath ${helpers.slugify(target)} ${helpers.slugify(source)} hidden` , true)
                        .attr('d', returnLinkPath)

                    // c. Adjust for 'prior' line thickness in advance (half link width)
                    currentReturnX1 += (settings.scales.linkScale(total)/2) + 5
                    currentReturnX0 -= (settings.scales.linkScale(total)/2) + 5
                    currentReturnY -= (settings.scales.linkScale(total)/2) + 5

                } else if(target.toLowerCase() !== 'landfill' && source.toLowerCase() === 'contamination'){ 
                    // a. Adjust for current line thickness (half link thickness)
                    currentContaminationReturnX -= (settings.scales.linkScale(total)/2)
                    currentContaminationReturnYOffset -= (settings.scales.linkScale(total)/2)
                    landfillArrowXEnd += (settings.scales.linkScale(total))
                    // b. Create path and append
                    const contaminationLandfill = `M${nodeEnd[0]},${nodeEnd[1]} 
                                                  L${currentContaminationReturnX},${nodeEnd[1]}                                 
                                                  q${returnCurveRadius},0 ${returnCurveRadius},${returnCurveRadius}  
                                                  L${currentContaminationReturnX+returnCurveRadius},${settings.nodePos.target.Landfill.y + currentContaminationReturnYOffset}  
                                                  q0,${returnCurveRadius} ${-returnCurveRadius},${returnCurveRadius} 
                                                  L${settings.nodePos.target.Landfill.x},${settings.nodePos.target.Landfill.y + currentContaminationReturnYOffset + returnCurveRadius}  
                                                `
                    linkLayer.append('path')
                        .attr('id', `${helpers.slugify(source)}__landfill`)
                        .classed(`link destination_landfill ${helpers.slugify(source)} ${helpers.slugify(target)} landfill` , true)
                        .attr('d', contaminationLandfill)
                        .attr('source', target)
                        .attr('target', source)
                        .attr('volume', total)
                        .style('stroke-width', settings.scales.linkScale(total))

                    annotationLinkLayer.append('path')
                        .attr('id', `annotationPath-${helpers.slugify(target)}__${helpers.slugify(source)}`)
                        .classed(`annotationPath ${helpers.slugify(target)} ${helpers.slugify(source)} hidden` , true)
                        .attr('d', contaminationLandfill)

                    currentContaminationReturnX -= (settings.scales.linkScale(total)/2) + 5
                    currentContaminationReturnYOffset -= (settings.scales.linkScale(total)/2) + 5

                    // d. Landfill directional arrow
                    directionLayer.append('path').classed(`landfill-arrow ${helpers.slugify(target)} landfill`, true)
                        .attr('d', 'M-.132-1.892v1.879h-6.483v1.905h13.23z')  
                        .attr('transform', `translate(${currentContaminationReturnX - 30}, ${nodeEnd[1] - settings.scales.linkScale(total/2) - 5 }) scale(${2})`)
                    directionLayer.append('path').classed(`landfill-arrow  ${helpers.slugify(source)} ${helpers.slugify(target)} landfill`, true)
                        .attr('d', 'M-.132 1.892V.013h-6.483v-1.905h13.23z')  
                        .attr('transform', `translate(${currentContaminationReturnX - 30}, ${nodeEnd[1] + settings.scales.linkScale(total/2) + 5}) scale(${2})`)
                } 
            })
        })

        // d. Additional nodes and labelling
            // i. Contaminated Local reprocessing to landfill annotation
            const contaminatedLocalReprocessingLabel = linkLabels.append('g').classed('linkLabel local-reprocessing', true),
                contaminatedLocalReprocessingTotal = +d3.select('#contamination__local-reprocessing').attr('volume'),
                contaminatedLocalReprocessingText = contaminatedLocalReprocessingTotal === 0 ? `No locally reprocessed resources sent to landfill`
                    : `${helpers.numberFormatters.formatComma(contaminatedLocalReprocessingTotal)} tonnes sent to landfill`

            contaminatedLocalReprocessingLabel.append('text').attr('id', `targetLabel-local-reprocessing__contamination`)
                .attr('x', currentContaminationReturnX + 10)
                .attr('dy', 0)
                .attr('y', settings.nodePos.target["Local reprocessing"].y + 140)
                .style('text-anchor', 'middle')
                .text(contaminatedLocalReprocessingText)
                .call(wrap, 160, 1.4)

            // ii. Contaminated export to landfill annotation
            const contaminatedExportLabel = linkLabels.append('g').classed('linkLabel export', true),
                contaminatedExportTotal = +d3.select('#contamination__export').attr('volume'),
                contaminatedExportText = contaminatedExportTotal === 0 ? `No export resources sent back to landfill`
                    : `${helpers.numberFormatters.formatComma(contaminatedExportTotal)} tonnes of contamination were sent to landfill`

            contaminatedExportLabel.append('text').attr('id', `targetLabel-export__contamination`)
                .attr('x', currentContaminationReturnX + 10)
                .attr('dy', 0)
                .attr('y', settings.nodePos.target.Export.y + 70 )
                .style('text-anchor', 'middle')
                .text(contaminatedExportText)
                .call(wrap, 160, 1.4)

            // iii. Total contamination back export to landfill annotation
            const contaminatedTotalLabel = linkLabels.append('g').classed('linkLabel landfill', true)
                contaminatedTotal = contaminatedLocalReprocessingTotal + contaminatedExportTotal,
                contaminatedTotalText = contaminatedTotal === 0 ? `No resources sent back to landfill`
                    : `A total of ${helpers.numberFormatters.formatComma(contaminatedTotal)} tonnes of contamination were sent back to landfill`

            contaminatedTotalLabel.append('text').attr('id', `targetLabel-export__contamination`)
                .attr('x', currentContaminationReturnX + 10)
                .attr('dy', 0)
                .attr('y', settings.nodePos.target.Landfill.y - 100 )
                .style('text-anchor', 'middle')
                .text(contaminatedTotalText)
                .call(wrap, 160, 1.4)


    //--------------------  7. NODE GROUP LABELS AND ARROWS -------------------//
        const collectionLabel = titleLayer.append('g').classed('title-label-group collection', true)
                                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x} , ${settings.dims.margin.top})`)
                                    .on('mouseover', groupLabelMouseover)
                                    .on('mouseout', groupLabelMouseout)
        collectionLabel.append('text')
            .classed('title-label collection', true)
            .text('Collected materials')
        collectionLabel.append('path').classed('node-group-arrow upper collection', true)
                .attr('d', 'M-.132-1.892v1.879h-6.483v1.905h13.23z')  
                .attr('transform', `translate(0, -${58}) scale(${5})`)
        collectionLabel.append('path').classed('node-group-arrow lower collection', true)
                .attr('d', 'M-.132 1.892V.013h-6.483v-1.905h13.23z')  
                .attr('transform', `translate(0, ${18}) scale(${5})`)

        const destinationLabel = titleLayer.append('g').classed('title-label-group destination', true)
                                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x} , ${settings.dims.margin.top})`)
                                    .on('mouseover', groupLabelMouseover)
                                    .on('mouseout', groupLabelMouseout)
        destinationLabel.append('text')
            .classed('title-label destination', true)
            .text('Destination')
        destinationLabel.append('path').classed('node-group-arrow upper destination', true)
                .attr('d', 'M-.132-1.892v1.879h-6.483v1.905h13.23z')  
                .attr('transform', `translate(0, -${58}) scale(${5})`)
        destinationLabel.append('path').classed('node-group-arrow lower destination', true)
                .attr('d', 'M-.132 1.892V.013h-6.483v-1.905h13.23z')  
                .attr('transform', `translate(0, ${18}) scale(${5})`)

        const recycledLabel = titleLayer.append('g').classed('title-label-group recycling', true)
                                    .attr('transform', `translate(${(settings.dims.width - settings.dims.margin.left)/2 } , ${settings.dims.margin.top * 2/3})`)
                                    .on('mouseover', groupLabelMouseover)
                                    .on('mouseout', groupLabelMouseout)
        recycledLabel.append('text')
            .classed('title-label recycling', true)
            .text('Recycled products')
        recycledLabel.append('path').classed('node-group-arrow upper recycling', true)
                .attr('d', 'M-.132-1.892v1.879h-6.483v1.905h13.23z')  
                .attr('transform', `translate(0, -${58}) scale(-5, 5)`)
        recycledLabel.append('path').classed('node-group-arrow lower recycling', true)
                .attr('d', 'M-.132 1.892V.013h-6.483v-1.905h13.23z')  
                .attr('transform', `translate(0, ${18}) scale(-5, 5)`)


    //-------------- SVG ILLUSTRATION ---//
        const buildings = illustrationLayer.attr('id', 'flow-icon-building')
                        .append('use').attr('href', '#icon-building')
                        .classed('flow-icon', true)
                        .attr('transform', 'translate(10, 25) scale(0.25)')
                    
        const recyclingChain = illustrationLayer.attr('id', 'flow-icon-recycling')
                        .append('use').attr('href', '#icon-recycling')
                        .classed('flow-icon', true)
                        .attr('transform', 'translate(750, -50) scale(0.65)')

        const infographicHeader = illustrationLayer.append('text')
                        .classed('flow-icon text-header', true)
                        .attr('transform', 'translate(50, 770)')
                        .text('How resources are recovered')
       illustrationLayer.append('text')
            .classed('flow-icon text', true)
            .attr('transform', 'translate(50, 800)')
            .html('Space for a more qualitative description of flows, potentially')
       illustrationLayer.append('text')
            .classed('flow-icon text', true)
            .attr('transform', 'translate(50, 830)')
            .html('involving discussion of data and trends for the selected time period;')
       illustrationLayer.append('text')
            .classed('flow-icon text', true)
            .attr('transform', 'translate(50, 860)')
            .html('or simply a more basic description suited to more beginner audience.')
       illustrationLayer.append('text')
            .classed('flow-icon text', true)
            .attr('transform', 'translate(50, 890)')
            .html('')


    //----------------------  8. EVENT LISTENERS (INTERACTIONS) -------------------//
    function nodeMouseover(d){
        const id = this.id,
            type = this.classList[0],
            name = this.classList[2],
            duration = 50
        // Highlight the selected node
        d3.selectAll(`circle.${type}:not(.${name}), text.nodeLabel.${type}:not(.${name})`)
            .transition().duration(duration)
                .style('fill', 'lightgrey')
        // Show the link labels
        d3.selectAll(`.linkLabel.${name}`) .transition().duration(duration)
            .style('opacity', 1)
        if(type === 'collection'){
            d3.selectAll(`path.link:not(.${name}), .landfill-arrow`)
                .transition().duration(duration)
                .style('opacity', 0)
        } else if(type === 'destination'){
            d3.selectAll(`path.link:not(.${name}), .landfill-arrow:not(.${name})`)
                .transition().duration(duration)
                .style('opacity', 0)
        }
    };

    function nodeMouseout(d){
        const  duration = 50,
            linksToShow =  !visualisations.flow[svgID].state.circularFlow ? '.link.collection_destination, .link.contamination' : '.link, .link.contamination' 
        d3.selectAll(`.node, text.nodeLabel, ${linksToShow}`).transition().duration(duration)
            .style('fill', null)
        d3.selectAll(`.linkLabel`).transition().duration(duration)
            .style('opacity', 0)
        d3.selectAll(`${linksToShow}, .landfill-arrow`).transition().duration(duration)
            .style('opacity', null)
    };

    function groupLabelMouseover(){
        const duration = 50,
            groupType =  this.classList[1]
        d3.selectAll(`.links-group, .node-group :not(.${groupType}), .title-label-group:not(.${groupType}), .nodeLabel:not(.${groupType}), .${groupType}.node-group-arrow, .annotation-direction`)
            .transition().duration(duration)
            .style('opacity', 0)
    };

    function groupLabelMouseout(){
        const duration = 50, 
            selection = visualisations.flow[svgID].state.circularFlow 
                ?`.links-group, .node-group *, .title-label-group, .nodeLabel, .node-group-arrow, .annotation-direction`  
                : `.links-group, .node-group *, .title-label-group:not(.recycling), .nodeLabel, .node-group-arrow, .annotation-direction`

        d3.selectAll(selection)
            .transition().duration(duration)
            .style('opacity', null)
    };

    window.addEventListener("keydown", function(key){
        // Keyboard events
        switch(key.code){
            case 'ShiftLeft':
                if(visualisations.flow[svgID].state.circularFlow){
                   visualisations.flow.methods.toggleIsometric(svgID, settings)
                }
                break
            case 'ShiftRight':
                if(visualisations.flow[svgID].state.icons){
                   d3.selectAll('.flow-icon').transition().duration(250).style('opacity', 0)
                } else {
                   d3.selectAll('.flow-icon').transition().duration(250).style('opacity', null)

                }
                visualisations.flow[svgID].state.icons = !visualisations.flow[svgID].state.icons
                break

            default:

        }
	})


    //--------------------  9.  SETUP INITIAL VIEWS -------------------//
    d3.selectAll('.linkLabel, .flow-icon').style('opacity', 0)
    d3.selectAll('.link.destination_collection').style('opacity', 0).style('pointer-events', 'none')
    d3.selectAll('.title-label-group.recycling').style('opacity', 0).style('pointer-events', 'none')


    //----------------- 10. ADD CHART VIEW OPTION TOGGLE BUTTON -----------------------//   
    if(document.getElementById(svgID)){
        const parentContainer = document.getElementById(svgID).parentElement,
            parentID = parentContainer.id,
            chartSelectorContainer = d3.select('#'+parentID).append('div').classed('chart-selector-container', true),
            onOffSwitch = chartSelectorContainer.append('div').classed('onoffswitch flow-diagram', true),
            input = onOffSwitch.append('input')
                        .attr('id', svgID+'-chartview-switch')
                        .classed('onoffswitch-checkbox', true) 
                        .attr('type', 'checkbox') 
                        .attr('name', 'onoffswitch') 
                        .attr('tabindex', 0) 
                        .attr('checked', true) 
                        .on('click',  () => visualisations.flow.methods.toggleCircularFlows(svgID, settings) ),
            labelContainer = onOffSwitch.append('label')
                        .classed('onoffswitch-label', true) 
                        .attr('for', `${svgID}-chartview-switch`)

        labelContainer.append('span').classed('onoffswitch-inner', true)
        labelContainer.append('span').classed('onoffswitch-switch', true)
    }


    //----------------------  HELPER FUNCTIONS -----------------//
    function cumsum(values, valueof) {
        var sum = 0, index = 0, value;
        return Float64Array.from(values, valueof === undefined
            ? v => (sum += +v || 0)
            : v => (sum += +valueof(v, index++, values) || 0));
    };

    function wrap(text, width, lineHeight, centerVertical = false) {
        text.each(function() {
            let text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                y = text.attr("y"),
                x = text.attr("x"),
                fontSize = parseFloat(text.style("font-size")),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));

                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y",  y)
                        .attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }                    
            }            
            if(centerVertical){
                text.style("transform",  "translateY(-"+(10 * (lineNumber))+"px)")
            }
        })
    };

}; // renderFlowVis


visualisations.flow.methods.toggleCircularFlows = async(svgID, settings) => {
    const duration = 2000
    // a. Move from linear to circular  */
    if(!visualisations.flow[svgID].state.circularFlow){
        d3.selectAll('.link.destination_collection')
            .style('pointer-events', 'auto')
            .transition().duration(duration)
                .style('opacity', null)
        d3.select('.title-label-group.recycling').style('pointer-events', null)
            .transition().duration(duration)
                .style('opacity', null)
        d3.select('.title-label-group.collection')
            .transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x} , ${settings.dims.height - settings.dims.margin.top/4})`)
        d3.select('.title-label-group.destination')
            .transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x} , ${settings.dims.height - settings.dims.margin.top/4})`)
    // b. Move from circular to linear  */
    } else {
        d3.selectAll('.link.destination_collection').style('pointer-events', 'none')
            .transition().duration(duration)
                .style('opacity', 0)
        d3.selectAll('.title-label-group.recycling').style('pointer-events', 'none')
            .transition().duration(duration)
                .style('opacity', 0)
        d3.selectAll('.title-label-group.collection')
            .transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x} , ${settings.dims.margin.top})`)
        d3.selectAll('.title-label-group.destination')
            .transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x} , ${settings.dims.margin.top})`)
    }
    // c. Update state
    visualisations.flow[svgID].state.circularFlow = !visualisations.flow[svgID].state.circularFlow

    // d. Update isometric labels 
    if(visualisations.flow[svgID].state.isometric ){
        d3.selectAll('.title-label.destination, .node-group-arrow.destination').transition().duration(duration/2)
            .style('opacity', 0)
        setTimeout( () => {
            d3.select('.title-label.destination').html('Destination')
            d3.selectAll('.title-label.destination, .node-group-arrow.destination')
                .transition().duration(250)
                .style('opacity', 1)
        }, 250)    
    }
};

visualisations.flow.methods.toggleIsometric = async(svgID, settings) => {
    const duration = 3000
    d3.selectAll(`#${svgID} *`).style('pointer-events', 'none')
    setTimeout( () => { d3.selectAll(`#${svgID} *`).style('pointer-events', null)}, duration)
    // a. 2D to Isometric
    if(!visualisations.flow[svgID].state.isometric){
        const nodePosSourceY = (d3.max(Object.values(settings.nodePos.source).map(d=> d.y)) - d3.min(Object.values(settings.nodePos.source).map(d=> d.y))) / 2 + d3.min(Object.values(settings.nodePos.source).map(d=> d.y)),
         nodePosTargetY = (d3.max(Object.values(settings.nodePos.target).map(d=> d.y)) - d3.min(Object.values(settings.nodePos.target).map(d=> d.y))) / 2 + d3.min(Object.values(settings.nodePos.target).map(d=> d.y))
        d3.selectAll('.layer').classed('isometric', true)
        // Move collection and destination labels, and transition arrows
        d3.select('.title-label-group.collection').transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x - 150}, ${nodePosSourceY}) rotate(-90)`)
        d3.select('.node-group-arrow.upper.collection').transition().duration(duration)
            .attr('transform', `translate(330, -10) scale(5) rotate(90)`)
        d3.select('.node-group-arrow.lower.collection').transition().duration(duration)
            .attr('transform', `translate(-330, -10) scale(5) rotate(90)`)
        d3.select('.title-label-group.destination').transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x + 250}, ${nodePosTargetY - 300}) rotate(-90)`)
        d3.selectAll('.title-label.destination, .node-group-arrow.destination').transition().duration(250)
            .style('opacity', 0)
        // Show the recycling loops
        d3.selectAll('.link.destination_collection')
            .style('pointer-events', 'auto')
            .transition().duration(duration)
                .style('opacity', null)
        d3.select('.title-label-group.recycling').style('pointer-events', null)
            .transition().duration(duration)
                .style('opacity', null)

        setTimeout( () => {
            d3.select('.title-label.destination').html('Recovered materials')
            d3.selectAll('.title-label.destination, .node-group-arrow.destination')
                .transition().duration(250)
                .style('opacity', 1)
        }, 250)    
    // b. Isometric to 2D
    } else {
        const nodePosY = visualisations.flow[svgID].state.circularFlow ? settings.dims.height - settings.dims.margin.top/4 : settings.dims.margin.top 
        d3.selectAll('.layer').classed('isometric', false)
        // Move collection and destination labels, and transition arrows
        d3.select('.title-label-group.collection').transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x}, ${nodePosY})`)
        d3.select('.node-group-arrow.upper.collection').transition().duration(duration)
            .attr('transform', `translate(0, -58) scale(5)`)
        d3.select('.node-group-arrow.lower.collection').transition().duration(duration)
            .attr('transform', `translate(0, 18) scale(5)`)
        d3.select('.title-label-group.destination').transition().duration(duration)
            .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x}, ${nodePosY})`)
        d3.selectAll('.title-label.destination, .node-group-arrow.destination').transition().duration(duration/2)
            .style('opacity', 0)
        setTimeout( () => {
            d3.select('.title-label.destination').html('Destination')
            d3.selectAll('.title-label.destination, .node-group-arrow.destination')
                .transition().duration(250)
                .style('opacity', 1)
        }, 250)    

    }
    // c. Update state
    visualisations.flow[svgID].state.isometric = !visualisations.flow[svgID].state.isometric 
};


///////////////////////////////////////
///////////////////////////////////////
/// SV FLOW VISUALISATION APP       ///
/// ------------------------------  ///
/// KERSBIDE COLLECTED WASTE DATA   ///
/// ------------------------------  ///
/// VERSION 1.0                     ///
///////////////////////////////////////
///////////////////////////////////////


///////////////////////////
/// VIS SETTINGS OBJECT ///
///////////////////////////

    // Object to store flow vis data, state and methods
    const vis = {
        flow:   {
            state: {
                step:                   null,  
                verticalNodePos:        false,
                collectionNodes:        false,
                destinationNodes:       false,
                collectionIllustration: false,
                destinationLinks:       false,
                circularLinks:          false,
                isometric:              false,
                materialPrices:         false,
                event:                  false,
                icons:                  false,
                dateRange: {
                    from:       null,
                    to:         null
                }
            },
            methods:    {
                scene:      {},
                anim:       {}
            },
            data: {
                tables:     {},
                lists:      {},
                chartData:  {}
            }
        }
    }

    // Visualisation settings and supporting shape generator functions
    const settings = {
        loader:             'GSheet',           // Used to define the data loader. Currently only GSheet
        svgID:              'flow-vis',
        tableName:          'data_mrfOutput',
        dims: {
            height: 1200, 
            width: 1920,
            margin: {
                top: 200, right: 100, bottom: 100, left: 100
            },
            linkSpacing: 15,
        }, 
        animation: {
            introDuration:      2000,
            updateDuration:     2000
        },
        nodes: { // Node arrays are manually listed in node position (vertical plot order)
            sources:    [
                {name: 'Paper and paperboard',  label: 'Paper and paperboard'},
                {name: 'Glass packaging',       label: 'Glass'},
                {name: 'Plastic packaging',     label: 'Plastic'},
                {name: 'Metal packaging',       label: 'Metals'},
                {name: 'Contamination',         label: 'Contamination'}
            ],     
            targets:    [
                {name:  'Local reprocessing',   label: 'Local reprocessing'},
                {name:  'Export',               label: 'Export'},
                {name:  'Landfill',             label: 'Landfill'},
            ],                    
        },
        nodePos: {
            source: {},
            target: {},
        },
        nodeSize:   {}, 
        geometry: {
            nodeGroupPos: {
                sources: {x: 330,   offset: 350},   
                targets: {x: 1550,  offset: -350},
            },
            nodeOffset: {
                sourceY:       70,             // Added offset positioning of 'top' source node
                targetY:       110,             // Added offset positioning of 'top' source node
            },
            linkSpacing:       15,              // Manually set to spread links to fit node height
            landfillLinkSpacing:       5,       // Manually set to spread contamination to landfill links
            nodeSpacing: {                      // Manually set to spread nodes to fit height
                source:        37.5,
                target:        100
            },
            nodeCircularLabelOffset: 7.5,
            returnLinks: {
                targetXOffset:      150,         // How far to the the right of the target nodes before the return links bend back
                sourceXOffset:      -100,        // How far to the the left of the source nodes before the return links bend back
                yOffset:            220,          
                curveRadius:        10         
            }
        },
        generators: {
            straight: 				d3.line().x( d => d.x ).y( d => d.y ),
            linkVertical: 			d3.linkVertical(),
            linkHorizontal: 		d3.linkHorizontal(),
            circleClockwise: 		(originObj, radius) => "M "+(originObj.x+radius)+","+originObj.y +" m 0,0  a "+radius+","+radius+" 0 0 1 "+(-radius * 2)+",0 a "+radius+","+radius+" 0 0 1 "+(radius * 2)+",0" ,
            circleAntiClockwise: 	(originObj, radius) => "M "+(originObj.x-radius)+","+originObj.y +" m 0,0  a "+radius+","+radius+" 0 1 0 "+(radius * 2)+",0 a "+radius+","+radius+" 0 1 0 "+(-radius * 2)+",0" 			
        },
        scales: {},       // Programatically created when max node and link sizes are calculated based on selected date range 
        linkPos:    {},
        palette:    {},         // Programatically created to matched to CSS colours for sources and targets
        queryParameters:    {},  // Objet to stor query string parameters
        annotation: {
            commentary: {
                'step-1':   'A breakdown of where material volumes collected for resource recovery',
                'step-2':   'A look at where collected materials goes',
            }
        }
    }

///////////////////////////////////////////////////////////////////////////
/// INITIATION FUNCTION TO LOAD DATA AND CALL THE BUILD REPORT FUNCTION ///
///////////////////////////////////////////////////////////////////////////

    build()

    function build() {
        console.log('LOADING DATA FROM '+settings.loader)
        loaderAnim()         // Loader reveal animation

        // 1. Load data from source and build vis
        switch(settings.loader) {
            case 'GSheet':   
                loadFromGSheetData()      
                break
            case 'Azure':
                alert('Azure endpoint connections have not been defined') 
                break

            default:
                alert('No data source defined in app settings')
        }

        // HELPERS FOR LOADING
        // Load data from TSV files from GSheet, using Papa Parse library
        function loadFromGSheetData(config){    
            // Data table links for each table used from same Google Sheet
            const gsTableLinks =  {
                data_mrfOutput:             'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYe9XdZL2TKia_B1Ncw8eKuwNTiTFhzNST0PWuCNqIUEFBbOlqCpW3ri5odmhng2vpXa5lL3PTHhzD/pub?gid=549382680&single=true&output=tsv',
            }
            const tablesToLoad = Object.keys(gsTableLinks)
            let noLoadedTables = 0

            // Load each table as tsv source using Papa parse
            for (const [tableName, tableURL] of Object.entries(gsTableLinks))   {
                Papa.parse(tableURL,  {
                    download: true,
                    header: true,
                    delimiter: '\t',                        
                    complete: async (results) => {
                        parseTable(tableName, results.data)
                        noLoadedTables++
                        // Call to buildVis after all tables are loaded and parsed
                        if(noLoadedTables === tablesToLoad.length){
                            await vis.flow.methods.parseData(vis.flow.data.tables[settings.tableName], settings)
                            await vis.flow.methods.applyQuerySettings()
                            await vis.flow.methods.setInterface()
                            await vis.flow.methods.setPalette() 
                            await vis.flow.methods.renderFlowVis(vis.flow.data.chart, settings)
                            vis.flow.methods.addNav() 
                        }
                    }
                })
            }   

            // Table data parsing function
            const parseTable = async (tableName, tableData) => {
                vis.flow.data.tables[settings.tableName] = tableData.map(row => {
                    const newObj = {}
                    Object.entries(row).forEach(([key, value]) => {
                        switch(key.toLowerCase()){
                            case 'date':
                                newObj[key] =  helpers.numberParsers.parseDateSlash(value)
                                break     
                            default:
                                newObj[key] = isNaN(parseFloat(value.replace(/,/g, ''))) ? value : parseFloat(value.replace(/,/g, '')) 
                        }
                    })
                    return newObj
                })
            };
        }; // end buildFromGSheetData

        // Set DOM elements to reveal on intro
        function loaderAnim(){
            d3.selectAll('#flow-vis-header, .date-selector-container, .stepper-container').style('opacity', 0)
            d3.selectAll('#flow-vis-header')
                .style('transform', 'translate(0, -10px)')
                .transition().duration(1000)
                    .style('opacity', null)
                    .style('transform', null)
        };


    }; // end build



/////////////////////////////////////////////////////////////
/// METHODS FOR APPLICATION | ATTACHED TO vis.flow object ///
/////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////
    /// PARSE AND TRANSFORM DATA & APPLY QUERY STRING TO SETTINGS  ///
    //////////////////////////////////////////////////////////////////

    vis.flow.methods.parseData = async (data, settings) => {
        // 1. Parse all data to number and date type        // 1. Extract date list
        vis.flow.data.lists.month = data.map(d => d.date).sort( (a,b) => a - b)

        // 3. Create a transformed source-target dataset for node-link plotting
        vis.flow.data.chart = []
        settings.nodes.sources.forEach(source => { 
            settings.nodes.targets.forEach(target => { 
                vis.flow.data.lists.month.forEach(month => {
                    data.forEach(d => {
                        if(d.date === month && !isNaN(d[`${target.name}_${source.name}`])){
                            vis.flow.data.chart.push({
                                date:       month, 
                                source:     source.name,
                                target:     target.name,
                                value:      d[`${target.name}_${source.name}`]
                            })
                        }
                    })
                })  
            })
        })
    }; // end parseData()


    vis.flow.methods.applyQuerySettings = async () => {
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('from')) { 
            vis.flow.state.dateRange.from = settings.queryParameters.get('from')  
        }
        if (settings.queryParameters.has('to')) { 
            vis.flow.state.dateRange.to = settings.queryParameters.get('to')  
        }
    }; // end applyQuerySettings()


    /////////////////////////////////
    /// RENDER FLOW VISUALISATION ///
    /////////////////////////////////

    vis.flow.methods.renderFlowVis = async (data, settings) => {
        //----- 1. SETUP SVG ELEMENTS -----//
            // a. Setup SVG element viewBox and add layers (in rendering order)
            const svg = d3.select(`#${settings.svgID}`).classed('figure fullpage svg-content', true)
                    .attr('viewBox', `0 0 ${settings.dims.width} ${settings.dims.height}`)
                    .attr('preserveAspectRatio', 'xMidYMid meet'),
                defs = svg.append('defs'),
                linkLayer = svg.append('g').classed('links-group-layer l1 layer', true),
                nodeLayer = svg.append('g').classed('node-group-layer l1 layer', true),
                annotationLayer = svg.append('g').classed('annotation-group-layer l1 layer', true),
                illustrationLayer = svg.append('g').classed('illustration-group-layer' , true ),
                linkDestinationLayer = linkLayer.append('g').classed('link-destination-group', true),
                linkReturnLayer = linkLayer.append('g').classed('link-return-group-layer layer', true),
                nodeLayerSource = nodeLayer.append('g').classed('node-group source layer', true),
                nodeLayerTarget = nodeLayer.append('g').classed('node-group target layer', true),
                annotationLinkLayer = annotationLayer.append('g').classed('annotation-linkPaths-group' , true ), 
                linkLabels = annotationLayer.append('g').classed('annotation-linkLabels' , true ),
                collectionIllustrationLayer = illustrationLayer.append('g').classed('illustration-collection-layer' , true ),
                isometricIllustrationLayer = illustrationLayer.append('g').classed('illustration-isometric-layer' , true ),
                titleLayer = annotationLayer.append('g').classed('annotation-titleLabels' , true ),
                directionLayer = annotationLayer.append('g').classed('annotation-direction' , true )

            // b. Call method to programmatically create link gradient fills in SVG defs
            await vis.flow.methods.setGradients(defs, settings)         

        //----- 2. DATA PREPARATION | FILTER DATA FOR DATE BOUNDS -----//
            // a. Filter and set chartData based on selected dates
            vis.flow.data.chartData = data.filter(d => 
                +d.date >= +vis.flow.data.lists.date[vis.flow.data.lists.month.indexOf(vis.flow.state.dateRange.from)] &&
                +d.date <= +vis.flow.data.lists.date[vis.flow.data.lists.month.indexOf(vis.flow.state.dateRange.to)]
            )
            // b. Set source an target lists directly from chartData
            vis.flow.data.lists.sources = [...new Set(vis.flow.data.chartData.map(d => d.source))]
            vis.flow.data.lists.targets = [...new Set(vis.flow.data.chartData.map(d => d.target))]

        //----- 3. SCALES | GET NODE SIZES AND DATA FOR SCALES -----//
            // a. Call function to set node and link scales   
            await vis.flow.methods.setScales()         
         
        //----- 4. NODE-LINK POSITIONING + APPEND NODES & LABELS -----//
            // a. Variables (mutatable) to vertically position each source and target nodes as they are looped over
            let currentSourceY = settings.dims.margin.top + settings.geometry.nodeOffset.sourceY,        
                currentTargetY = settings.dims.margin.top + settings.geometry.nodeOffset.targetY    

            // b. Set node group points for sources and append nodes and node labels 
            settings.nodeSize.source.forEach( obj => {
                const material =  Object.keys(obj)[0],
                    labelIndex = settings.nodes.sources.map(d => d.name).indexOf(material), 
                    label = settings.nodes.sources.map(d => d.label)[labelIndex],
                    value = Object.values(obj)[0],
                    radius = settings.scales.nodeRadScale(value),
                    xPos = settings.geometry.nodeGroupPos.sources.x,
                    yPos =  currentSourceY + radius   // radius of current circle,
                    circularLabelPath = settings.generators.circleClockwise({x: xPos, y: yPos}, radius + settings.geometry.nodeCircularLabelOffset)

                // Append node group with circle
                const nodeGroup = nodeLayerSource.append('g')
                    .attr('node-data', JSON.stringify({material , xPos, yPos, label, value, radius }))
                    .attr('id', `${helpers.slugify(material)}-node-group`)
                    .classed('node-group', true)

                nodeGroup.append('circle')
                    .attr('id', `${helpers.slugify(material)}-node`)
                    .classed('collection node '+helpers.slugify(material), true)
                    .datum({ label: label, value: value })
                    .attr('r', radius)
                    .attr('cx', xPos)
                    .attr('cy', yPos)
                    .on('mouseover', nodeMouseover)
                    .on('mouseout', mouseout)

                // Append circular node label
                const nodeLabel = nodeGroup.append('g')
                    .attr('id',`${helpers.slugify(material)}-labelGroup`)
                    .classed('nodeLabel-group', true)
                nodeLabel.append('path').attr('id', `${helpers.slugify(material)}-labelPath`)
                    .classed('nodeLabelPath', true)
                    .attr('d', circularLabelPath )
                nodeLabel.append('text').attr('id', `${helpers.slugify(material)}-label`)
                    .classed(`nodeLabel collection textOnPath source ${helpers.slugify(material)}`, true)
                    .append('textPath').attr("xlink:href", `#${helpers.slugify(material)}-labelPath`)				
                        .attr('startOffset',  	'75%') 
                        .style('text-anchor',  'middle')    // place the text halfway on the arc
                        .style('letter-spacing', 0)         
                        .style('font-size', settings.scales.nodeCircularLabelScale(value) )
                        .text(label)

                // Append total label for material
                const totalLabel = nodeLabel.append('g')
                    .attr('id',`${helpers.slugify(material)}-totalLabel-group`) 
                    .classed(`node-label-centered ${helpers.slugify(material)}`, true)
                    .attr('transform', `translate(${xPos}, ${yPos})`)
                totalLabel.append('text')
                    .attr('id',`${helpers.slugify(material)}-totalLabel`) 
                    .classed('source label node', true)
                    .style('font-size', settings.scales.nodeLabelScale(value))
                    .html(0)
                    .transition().duration(settings.animation.introDuration)
                        .tween('text', function(d){
                            let i = d3.interpolate(+this.textContent, value);
                            return function(t) {  
                                d3.select(this).text(helpers.numberFormatters.formatComma(i(t)))  
                            };
                        });
                totalLabel.append('text')
                    .classed('source label node unit', true)
                    .style('font-size', settings.scales.nodeUnitLabelScale(value))
                    .attr('dy', settings.scales.nodeUnitOffsetScale(value))
                    .html('tonnes' )

                settings.nodePos.source[material] = {x: xPos, y: yPos, radius: radius, volume: value}
                currentSourceY = yPos + settings.scales.nodeRadScale(value) + settings.geometry.nodeSpacing.source      // add radius of prior circle + buffer
            })

            // c. Set  node group points for targets and append nodes and node labels 
            settings.nodeSize.target.forEach( obj => {
                const target = Object.keys(obj)[0], 
                    value = Object.values(obj)[0],
                    radius = settings.scales.nodeRadScale(value),
                    xPos = settings.geometry.nodeGroupPos.targets.x,
                    yPos =  currentTargetY + settings.scales.nodeRadScale(value)   // radius of current circle

                const nodeGroup = nodeLayerTarget.append('g')
                    .attr('node-data', JSON.stringify({target, xPos, yPos, value, radius }))
                    .attr('id', `${helpers.slugify(target)}-node-group`)
                    .classed('node-group', true)

                nodeGroup.append('circle')
                    .attr('id', `${helpers.slugify(target)}-node`)
                    .classed('destination node '+helpers.slugify(target), true)
                    .datum({ label: target,  value: value })
                    .attr('r', radius)
                    .attr('cx', xPos)
                    .attr('cy', yPos)
                    .on('mouseover', nodeMouseover)
                    .on('mouseout', mouseout)

                // Append circular node label
                const nodeLabel = nodeGroup.append('g').classed('nodeLabel-group', true)
                nodeLabel.append('path').attr('id', `${helpers.slugify(target)}-labelPath`)
                    .classed('nodeLabelPath', true)
                    .attr('d', settings.generators.circleClockwise({x: xPos, y: yPos}, radius + settings.geometry.nodeCircularLabelOffset ) )
                nodeLabel.append('text').attr('id', `${helpers.slugify(target)}-label`)
                    .classed(`nodeLabel destination textOnPath target ${helpers.slugify(target)}`, true)
                    .append('textPath').attr("xlink:href", `#${helpers.slugify(target)}-labelPath`)				
                        .attr('startOffset',  	'75%') 
                        .style('text-anchor',   'middle') 
                        .style('letter-spacing', 0) 
                        .style('font-size', settings.scales.nodeCircularLabelScale(value) )
                        .text(target)

                // Add 'and storage' to local processing
                if(target=== 'Local reprocessing'){
                    const nodeLabel2 = nodeGroup.append('g').classed('nodeLabel-group', true)
                    nodeLabel2.append('path').attr('id', `${helpers.slugify(target)}-labelPath-2`)
                        .classed('nodeLabelPath', true)
                        .attr('d', settings.generators.circleAntiClockwise({x: xPos, y: yPos}, radius + 20 ) )
                        .attr('transform', 'translate(0, 5)') 
                    nodeLabel2.append('text').attr('id', `${helpers.slugify(target)}-label-2`)
                        .classed(`nodeLabel destination textOnPath target ${helpers.slugify(target)}`, true)
                        .append('textPath').attr("xlink:href", `#${helpers.slugify(target)}-labelPath-2`)				
                            .attr('startOffset',  	'25%') 
                            .style('text-anchor',   'middle') 
                            .style('letter-spacing', 1.5) 
                            .style('font-size', settings.scales.nodeCircularLabelScale(value) )
                            .text('and storage')
                }

                // Append total label
                const totalLabel = nodeGroup.append('g')
                    .attr('id', `${helpers.slugify(target)}-totalLabel-group`)
                    .classed(`node-label-centered ${helpers.slugify(target)}`, true)
                    .attr('transform', `translate(${xPos}, ${yPos})`)
                totalLabel.append('text')
                    .attr('id', `${helpers.slugify(target)}-totalLabel`)
                    .classed('target label node', true)
                    .style('font-size', settings.scales.nodeLabelScale(value))
                    .html(0)
                    .transition().duration(settings.animation.introDuration)
                        .tween('text', function(d){
                            let i = d3.interpolate(+this.textContent, value);
                            return function(t) {  
                                d3.select(this).text(helpers.numberFormatters.formatComma(i(t)))  
                            };
                        });

                totalLabel.append('text')
                    .classed('target label node unit', true)
                    .style('font-size', settings.scales.nodeUnitLabelScale(value) )
                    .attr('dy', settings.scales.nodeUnitOffsetScale(value))
                    .html('tonnes')

                settings.nodePos.target[target] = {x: xPos, y: yPos, radius: radius}
                currentTargetY = yPos + settings.scales.nodeRadScale(value) + settings.geometry.nodeSpacing.target  // add radius of prior circle + buffer
            })    


        //----- 5. RENDER MATERIAL FLOW LINKS ------//
            // a. Call function to determine set link position data
            await vis.flow.methods.setLinkPositions() 

            // b. Append the links themselves, as well as set up labelling / animation pathways
            let currentReturnX1   = settings.geometry.nodeGroupPos.targets.x + settings.geometry.returnLinks.targetXOffset, 
                currentReturnX0   = settings.geometry.nodeGroupPos.sources.x + settings.geometry.returnLinks.sourceXOffset,
                currentReturnY    = settings.geometry.returnLinks.yOffset,
                returnCurveRadius = settings.geometry.returnLinks.curveRadius,
                landfillArrowXEnd = settings.geometry.nodeGroupPos.targets.x + settings.geometry.returnLinks.targetXOffset,
                currentContaminationReturnX = settings.geometry.nodeGroupPos.targets.x + settings.geometry.returnLinks.targetXOffset,
                currentContaminationReturnYOffset = 0

            Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
                Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
                    const material = settings.nodes.sources.map(d => d.label)[settings.nodes.sources.map(d => d.name).indexOf(source)],
                        destination = settings.nodes.targets.map(d => d.label)[settings.nodes.targets.map(d => d.name).indexOf(target)],
                        total = d3.sum(vis.flow.data.chartData.filter(d => d.source === source && d.target=== target).map(d => d.value))

                        const sourcePosObj = settings.linkPos[source].filter(d=> d.connection === target)[0],
                            targetPosObj = settings.linkPos[target].filter(d=> d.connection === source)[0],
                            nodeStart    = [sourceNode.x + sourcePosObj.dx, sourceNode.y + sourcePosObj.dy],
                            linkOffset1  = [sourceNode.x + sourcePosObj.dx + settings.geometry.nodeGroupPos.sources.offset, sourceNode.y + sourcePosObj.dy],
                            nodeEnd      = [targetNode.x + targetPosObj.dx, targetNode.y + targetPosObj.dy],
                            linkOffset2  = [targetNode.x + targetPosObj.dx + settings.geometry.nodeGroupPos.targets.offset, targetNode.y + targetPosObj.dy],
                            points       = {source: linkOffset1, target: linkOffset2},
                            linkPath     = `M${nodeStart[0]},${nodeStart[1]} L${settings.generators.linkHorizontal(points).slice(1)}  L${nodeEnd[0]},${nodeEnd[1]}`

                        // i. Source to target link (add link as part of group with gradient)
                        const linkGroup = linkDestinationLayer.append('g').classed('link-group', true),
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
                            .style('stroke-width', total === 0 ? 0 : settings.scales.linkScale(total))
                                .on('mouseover', linkMouseover)
                                .on('mouseout', mouseout)

                        // ii. Source to target annotation path
                        annotationLinkLayer.append('path')
                            .attr('id', `annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`)
                            .classed(`annotationPath ${helpers.slugify(source)} ${helpers.slugify(target)} hidden` , true)
                            .attr('d', linkPath)

                        /// iii. Source side label (% of source) and volume into MRF
                        const sourcelinkLabel = linkLabels.append('g').classed(`linkLabel textOnPath destination-colour ${helpers.slugify(source)} ${helpers.slugify(target)}`, true)
                                .attr('transform', 'translate(0, 6)'),
                            targetlinkLabel = linkLabels.append('g').classed(`linkLabel textOnPath collection-colour ${helpers.slugify(source)} ${helpers.slugify(target)}`, true)
                                .attr('transform', 'translate(0, 6)'), 
                            linkLength = document.getElementById(`annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`).getTotalLength(),
                            sourceLabel = total === 0 ? `→ No collected ${source.toLowerCase()} sent to ${target.toLowerCase()}`
                                : `→ ${helpers.numberFormatters.formatPct1dec(total/sourceNode.volume)} of collected ${material.toLowerCase()} sent to ${target.toLowerCase()} (${helpers.numberFormatters.formatComma(total)} tonnes) → `,
                            targetLabel = total === 0 ? `No ${source.toLowerCase()} received →`
                                : `${helpers.numberFormatters.formatComma(total)} tonnes of ${source.toLowerCase()} received →`

                        sourcelinkLabel.append('text').attr('id', `sourceLabel-${helpers.slugify(source)}__${helpers.slugify(target)}`)
                            .append('textPath').attr("xlink:href", `#annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`)				
                                .attr('startOffset',  sourceNode.radius + 20) 
                                .style('text-anchor',  'start') 
                                .style('letter-spacing', 0) 
                                .text(sourceLabel)

                        // iv. Target to source "return" and to contamination link
                        if(target.toLowerCase() !== 'landfill' && source.toLowerCase() !== 'contamination'){
                            // a. Adjust for current line thickness (half link thickness)
                            currentReturnX1 += (settings.scales.linkScale(total)/2)
                            currentReturnX0 -= (settings.scales.linkScale(total)/2)
                            currentReturnY  -= (settings.scales.linkScale(total)/2)
                            // b. Create link path
                            const returnLinkPath = `
                                M${nodeEnd[0]},${nodeEnd[1]} 
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
                            const linkGroup = linkReturnLayer.append('g').classed('return-link-group', true),                
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
                                .attr('id', `${helpers.slugify(target)}__${helpers.slugify(source)}`)
                                .classed(`link destination_collection ${helpers.slugify(source)} ${helpers.slugify(target)} return` , true)
                                .attr('d', returnLinkPath)
                                .attr('source', target)
                                .attr('target', source)
                                .attr('volume', total)
                                .attr('stroke', `url(#${helpers.slugify(target)}_link_${helpers.slugify(source)})`)
                                .style('stroke-width', total === 0 ? 0 : settings.scales.linkScale(total))
                                    .on('mouseover', linkMouseover)
                                    .on('mouseout', mouseout)

                            annotationLinkLayer.append('path')
                                .attr('id', `annotationPath-${helpers.slugify(target)}__${helpers.slugify(source)}`)
                                .classed(`annotationPath ${helpers.slugify(target)} ${helpers.slugify(source)} hidden` , true)
                                .attr('d', returnLinkPath)

                            // c. Adjust for 'prior' line thickness in advance (half link width)
                            currentReturnX1 += (settings.scales.linkScale(total)/2) + settings.geometry.landfillLinkSpacing
                            currentReturnX0 -= (settings.scales.linkScale(total)/2) + settings.geometry.landfillLinkSpacing
                            currentReturnY -= (settings.scales.linkScale(total)/2) + settings.geometry.landfillLinkSpacing

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
                                .attr('id', `${helpers.slugify(target)}__landfill`)
                                .classed(`link destination_landfill ${helpers.slugify(target)} ${helpers.slugify(source)} landfill` , true)
                                .attr('d', contaminationLandfill)
                                .attr('source', target)
                                .attr('target', source)
                                .attr('volume', total)
                                .style('stroke-width', settings.scales.linkScale(total))

                            annotationLinkLayer.append('path')
                                .attr('id', `annotationPath-${helpers.slugify(target)}__landfill`)
                                .classed(`annotationPath ${helpers.slugify(target)} ${helpers.slugify(source)} hidden` , true)
                                .attr('d', contaminationLandfill)

                            currentContaminationReturnX -= (settings.scales.linkScale(total)/2) + settings.geometry.landfillLinkSpacing
                            currentContaminationReturnYOffset -= (settings.scales.linkScale(total)/2) + settings.geometry.landfillLinkSpacing

                            // d. Landfill directional arrow
                            directionLayer.append('path').attr('id', `landfill-arrow-1-${helpers.slugify(target)}`)
                                .classed(`landfill-arrow ${helpers.slugify(target)} landfill`, true)
                                .attr('d', 'M-.132-1.892v1.879h-6.483v1.905h13.23z')  
                                .attr('transform', `translate(${currentContaminationReturnX - 30}, ${nodeEnd[1] - settings.scales.linkScale(total/2) - settings.geometry.landfillLinkSpacing }) scale(${2})`)
                            directionLayer.append('path').attr('id', `landfill-arrow-2-${helpers.slugify(target)}`,)
                                .classed(`landfill-arrow  ${helpers.slugify(source)} ${helpers.slugify(target)} landfill`, true)
                                .attr('d', 'M-.132 1.892V.013h-6.483v-1.905h13.23z')  
                                .attr('transform', `translate(${currentContaminationReturnX - 30}, ${nodeEnd[1] + settings.scales.linkScale(total/2) + settings.geometry.landfillLinkSpacing}) scale(${2})`)
                        } 
                    // }
                })
            })

            // c. Additional nodes and labelling
                // i. Contaminated Local reprocessing to landfill annotation
                const contaminatedLocalReprocessingLabel = linkLabels.append('g').classed('linkLabel local-reprocessing', true),
                    contaminatedLocalReprocessingTotal = +d3.select('#contamination__local-reprocessing').attr('volume'),
                    contaminatedLocalReprocessingBBox  = document.getElementById('local-reprocessing__landfill').getBBox(),
                    contaminatedLocalReprocessingText = contaminatedLocalReprocessingTotal === 0 ? `No locally reprocessed resources sent to landfill`
                        : `${helpers.numberFormatters.formatComma(contaminatedLocalReprocessingTotal)} tonnes sent to landfill`

                contaminatedLocalReprocessingLabel.append('text').attr('id', `targetLabel-local-reprocessing__contamination`)
                    .attr('x', contaminatedLocalReprocessingBBox.x + contaminatedLocalReprocessingBBox.width)
                    .attr('dy', 0)
                    .attr('y', contaminatedLocalReprocessingBBox.y + contaminatedLocalReprocessingBBox.height * 0.15)
                    .style('text-anchor', 'middle')
                    .text(contaminatedLocalReprocessingText)
                    .call(helpers.textWrap, 160, 1)

                // ii. Contaminated export to landfill annotation
                const contaminatedExportLabel = linkLabels.append('g').classed('linkLabel export', true),
                    contaminatedExportTotal = +d3.select('#contamination__export').attr('volume'),
                    contaminatedExportBBox  = document.getElementById('export__landfill').getBBox(),
                    contaminatedExportText = contaminatedExportTotal === 0 ? `No export resources sent back to landfill`
                        : `${helpers.numberFormatters.formatComma(contaminatedExportTotal)} tonnes of contamination were sent to landfill`

                contaminatedExportLabel.append('text').attr('id', `targetLabel-export__contamination`)
                    .attr('x', contaminatedExportBBox.x + contaminatedExportBBox.width)
                    .attr('dy', 0)
                    .attr('y', contaminatedExportBBox.y + contaminatedExportBBox.height/3)
                    .style('text-anchor', 'middle')
                    .text(contaminatedExportText)
                    .call(helpers.textWrap, 160, 1)

                // iii. Total contamination back export to landfill annotation
                const contaminatedTotalLabel = linkLabels.append('g').classed('linkLabel landfill', true),
                    contaminatedTotal = contaminatedLocalReprocessingTotal + contaminatedExportTotal,
                    contaminatedTotalText = contaminatedTotal === 0 ? `No resources sent back to landfill`
                        : `A total of ${helpers.numberFormatters.formatComma(contaminatedTotal)} tonnes of contamination were sent back to landfill`

                contaminatedTotalLabel.append('text').attr('id', `targetLabel-export__contamination`)
                    .attr('x', contaminatedExportBBox.x + contaminatedExportBBox.width)
                    .attr('dy', 0)
                    .attr('y', contaminatedExportBBox.y + contaminatedExportBBox.height/3)
                    .style('text-anchor', 'middle')
                    .text(contaminatedTotalText)
                    .call(helpers.textWrap, 160, 1)


        //--------------------  6. NODE GROUP LABELS AND ARROWS -------------------//
            const collectionLabel = titleLayer.append('g')
                .classed('title-label-group collection', true)
                .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x} , ${settings.dims.margin.top})`)
                .on('mouseover', groupLabelMouseover)
                .on('mouseout', groupLabelMouseout)
            collectionLabel.append('text')
                .classed('title-label collection', true)
                .text('Collection')
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


        //-------------- ANNOTATION LAYER ---//
            const totalFlow = d3.sum(settings.nodeSize.source.map(d => Object.values(d)[0])),
                dateString = vis.flow.state.dateRange
                
            annotationLayer.append('text')
                .attr('id', 'step-annotation')
                .classed('title-text', true)
                .attr('x', settings.dims.width * 0.5)
                .attr('y', settings.dims.height * 0.5)
                .attr('dy', 0)
                .text(settings.annotation.commentary['step-1'])



        //-------------- INTRO & SVG ILLUSTRATION LAYER ---//
        await vis.flow.methods.renderCollectionIllustrations(collectionIllustrationLayer)
        await vis.flow.methods.renderIsometricIllustrations(isometricIllustrationLayer)
        await vis.flow.methods.scene.intro(settings.animation.introDuration)


        //----------------------  8. EVENT LISTENERS (INTERACTIONS) -------------------//
        function nodeMouseover(d){
            const id = this.id,
                type = this.classList[0],
                name = this.classList[2],
                duration = 200
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

        function linkMouseover(d){
            const id = this.id,
                type = this.classList[0],
                start = this.classList[2],
                end = this.classList[3],
                duration = 200

            // Highlight the connected nodes
            d3.selectAll(`circle.node:not(.${start}, .${end} ), text.nodeLabel.textOnPath:not(.${start}, .${end})`)
                .transition().duration(duration)
                    .style('fill', 'lightgrey')

            // Show the link labels
            d3.selectAll(`.linkLabel.${start}.${end}`).transition().duration(duration)
                .style('opacity', 1)

            // Hide other links and landfill arrow
            d3.selectAll(`.link:not(.${start}.${end}), .landfill-arrow`).transition().duration(duration)
                .style('opacity', 0)
        };

        function mouseout(d){
            const  duration = 50,
                linksToShow =  !vis.flow.state.circularFlow ? '.link.collection_destination, .link.contamination' : '.link, .link.contamination' 
            d3.selectAll(`.node, text.nodeLabel, ${linksToShow}`).transition().duration(duration)
                .style('fill', null)
            d3.selectAll(`.linkLabel`).transition().duration(duration)
                .style('opacity', 0)
            d3.selectAll(`${linksToShow}, .landfill-arrow`).transition().duration(duration)
                .style('opacity', null)
        };

        function groupLabelMouseover(){
            const duration = 200,
                groupType =  this.classList[1]
            // d3.selectAll(`.links-group, .node-group :not(.${groupType}), .title-label-group:not(.${groupType}), .nodeLabel:not(.${groupType}), .${groupType}.node-group-arrow, .annotation-direction`)
            //     .transition().duration(duration)
            //     .style('opacity', 0)
        };

        function groupLabelMouseout(){
            const duration = 50, 
                selection = vis.flow.state.circularFlow 
                    ?`.links-group, .node-group *, .title-label-group, .nodeLabel, .node-group-arrow, .annotation-direction`  
                    : `.links-group, .node-group *, .title-label-group:not(.recycling), .nodeLabel, .node-group-arrow, .annotation-direction`

            // d3.selectAll(selection)
            //     .transition().duration(duration)
            //     .style('opacity', null)
        };

    }; // renderFlowVis()

    vis.flow.methods.renderIsometricIllustrations = async (layer) => {
        const landfillVolume = settings.nodeSize.target.filter(d => Object.keys(d)[0] === 'Landfill')[0].Landfill,
             totalCollected = d3.sum(settings.nodeSize.target.map(d => Object.values(d)[0]) )

        const buildings = layer.attr('id', 'flow-icon-building')
            .append('use').attr('href', '#icon-building')
            .classed('flow-icon', true)
            .attr('transform', 'translate(10, 25) scale(0.25)')
                    
        const recyclingChain = layer.attr('id', 'flow-icon-recycling')
            .append('use').attr('href', '#icon-recycling')
            .classed('flow-icon', true)
            .attr('transform', 'translate(750, -50) scale(0.65)')

        // Contamination rate
        layer.append('text')
            .attr('id', 'system-contamination-pct')
            .classed('title system-contamination', true)
            .attr('transform', 'translate(50, 700)')
            .html(`${helpers.numberFormatters.formatPct1dec(landfillVolume/totalCollected)}`)
        layer.append('text')
            .classed('sub-title system-contamination', true)
            .attr('transform', 'translate(50, 750)')
            .html('contamination')

        // Total recovery
        layer.append('text')
            .attr('id', 'system-recovery-volume')
            .classed('title system-recovery', true)
            .attr('transform', 'translate(50, 960)')
            .html(`${helpers.numberFormatters.formatComma(totalCollected - landfillVolume)}`)
        layer.append('text')
            .classed('sub-title system-recovery', true)
            .attr('transform', 'translate(50, 1030)')
            .html('tonnes recovered')

    }; // end renderIsometricIllustrations()

    vis.flow.methods.renderCollectionIllustrations = async (layer) => {
        const binGroup = layer.append('g').classed('bin-illustration-group', true)
            .attr('transform', `translate(${settings.dims.width/2}, ${settings.dims.height * 0.0025}) scale(${4.5})`)
        binGroup.append('path').attr('id', 'bin-path-01').attr('d', "M-60.484 55.01V186.25")
        binGroup.append('path').attr('id', 'bin-path-02').attr('d', "M-77.148 30.013V55.01H79.771V30.013z")
        binGroup.append('path').attr('id', 'bin-path-03').attr('d', "M-32.3 215.595a15.73 15.73 0 01-15.73 15.73 15.73 15.73 0 01-15.73-15.73 15.73 15.73 0 0115.73-15.73 15.73 15.73 0 0115.73 15.73z")
        binGroup.append('path').attr('id', 'bin-path-04').attr('d', "M-30.671 241.98h67.393c8.61 0 16.664-3.61 18.053-15.172l9.998-171.696")
        binGroup.append('path').attr('id', 'bin-path-05').attr('d', "M-16.307 215.595a31.723 31.723 0 01-31.723 31.723 31.723 31.723 0 01-31.722-31.723 31.723 31.723 0 0131.722-31.722 31.723 31.723 0 0131.723 31.722")
        binGroup.append('path').attr('id', 'bin-path-06').attr('d', "M-77.371 29.659c14.96-9.544 29.538-18.997 47.826-23.12C-1.012.106 34.336-5.49 67.621 9.799l2.11 20.036")
    }; // end renderCollectionIllustrations()


    //////////////////////////////////////////////////////////
    /// SUPPORTING METHODS FOR RENDER AND UPDATE FUNCTIONS ///
    //////////////////////////////////////////////////////////

    vis.flow.methods.setGradients = async (defs, settings) => {
        // a. Group label gradient fills
        const collectionGradient = defs.append('linearGradient').attr('id', 'collection-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%')
                .attr('y1', '25%')
                .attr('y2', '0%')

        settings.nodes.sources.forEach((source, i) => {
            const sourceClassname = helpers.slugify(source.name),
                colour = settings.palette[sourceClassname],
                offset = 100 / (settings.nodes.sources.length - 1) * i
            collectionGradient.append('stop')
                .attr('offset', Math.round(offset*10)/10+'%')
                .attr('stop-color', colour)
        })
        
        const destinationGradient = defs.append('linearGradient').attr('id', 'destination-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%')
                .attr('y1', '25%')
                .attr('y2', '0%')

        settings.nodes.targets.filter(d=> d.name !== 'Storage').forEach((target, i) => {
            const targetsClassname = helpers.slugify(target.name),
                colour = settings.palette[targetsClassname],
                offset = 100 / (settings.nodes.targets.filter(d=> d.name !== 'Storage').length-1) * i
            destinationGradient.append('stop')
                .attr('offset', Math.round(offset*10)/10+'%')
                .attr('stop-color', colour)
        })

        const recycledGradient = defs.append('linearGradient').attr('id', 'recycling-gradient')
                .attr('x1', '0%')
                .attr('x2', '100%')
                .attr('y1', '25%')
                .attr('y2', '0%')
        
        const nodeArray = settings.nodes.sources.concat(settings.nodes.targets.filter(d => d.name !== 'Storage'))

        nodeArray.forEach((node, i) => {
            const className = helpers.slugify(node.name),
                colour = settings.palette[className],
                offset = 100 / (nodeArray.length-1) * i

            recycledGradient.append('stop')
                .attr('offset', Math.round(offset*10)/10+'%')
                .attr('stop-color', colour)
        })
    }; // setGradients | Only used in render

    vis.flow.methods.setPalette = async () => {
        settings.palette = {
            'local-reprocessing':       helpers.getCSSVarHex('secondaryBottleGreen'),     
            'export':                   helpers.getCSSVarHex('secondaryBottleGreenLight'),  
            'landfill':                 helpers.getCSSVarHex('tertiaryCard'),   
            'paper-and-paperboard':     helpers.getCSSVarHex('tertiaryYellow'),      
            'glass-packaging':          helpers.getCSSVarHex('tertiaryPurple'), 
            'plastic-packaging':        helpers.getCSSVarHex('tertiaryRed'), 
            'metal-packaging':          helpers.getCSSVarHex('tertiaryBlue'),
            'contamination':            helpers.getCSSVarHex('tertiaryCard')
        }
    }; // end setPalette() | Only used in render

    vis.flow.methods.setScales = async() => {
        settings.nodeSize.source = vis.flow.data.lists.sources.map( source => {
            return { [source]:  d3.sum(vis.flow.data.chartData.filter(d => d.source === source).map(d => d.value)) }
        })
        settings.nodeSize.target = vis.flow.data.lists.targets.map( target => {
            return { [target]:  d3.sum(vis.flow.data.chartData.filter(d => d.target === target).map(d => d.value)) }
        })

        const maxNode = d3.max(settings.nodeSize.source.map(d => Object.values(d)[0]).concat(settings.nodeSize.target.map(d => Object.values(d)[0]))),
            minNode = d3.min(settings.nodeSize.source.map(d => Object.values(d)[0]).concat(settings.nodeSize.target.map(d => Object.values(d)[0]))),
            sourceNodeTotal = d3.sum(settings.nodeSize.source.map(d => Object.values(d)[0])),
            dataGroupedByDate = d3.group(vis.flow.data.chartData, d => d.date), 
            dateArray = [...new Set(vis.flow.data.chartData.map(d => d.date))]

        // Get maximum link size
        let summedLinkArray = []
        dateArray.forEach((date, i) => {
            const arr = dataGroupedByDate.get(date).map(d => d.value)
            if(summedLinkArray.length === 0){
                summedLinkArray = arr
            } else {
                summedLinkArray = summedLinkArray.map((d,j) => d + arr[j] )
            }            
        })
        const maxLink = d3.max(summedLinkArray)

        settings.scales = {
            nodeRadScale:               d3.scaleSqrt().domain([0, maxNode]).range([20, 100]),
            linkScale:                  d3.scaleLinear().domain([0, maxLink]).range([3, maxLink/maxNode * 100]),
            nodeCircularLabelScale:     d3.scaleLinear().domain([0, maxNode]).range([22 , 34]),
            nodeLabelScale:             d3.scaleSqrt().domain([0, maxNode]).range([10, 44]),
            nodeArrowScale:             d3.scaleLinear().domain([0, maxNode]).range([1.25, 8]),
            nodeUnitLabelScale:         d3.scaleSqrt().domain([0, maxNode]).range([8, 22]),
            nodeUnitOffsetScale:        d3.scaleSqrt().domain([0, maxNode]).range([10, 32])
        }
    }; // end setScales()

    vis.flow.methods.setLinkPositions = async() => {
        // a. Find link thickness at each source and target node to calculate spacing at each source/target node
        Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
            settings.linkPos[source] = []
            Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
                const linkTotal = d3.sum(vis.flow.data.chartData.filter(d => d.source === source && d.target=== target).map(d => d.value))
                settings.linkPos[source].push({
                    connection:     target, 
                    value:          linkTotal, 
                    linkWidth:      linkTotal > 0 ? settings.scales.linkScale(linkTotal) : 0
                })
            })
        })

        Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
            settings.linkPos[target] = []
            Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
                const linkTotal = d3.sum(vis.flow.data.chartData.filter(d => d.source === source && d.target=== target).map(d => d.value))
                settings.linkPos[target].push({
                    connection:     source, 
                    value:          linkTotal, 
                    linkWidth:      linkTotal > 0 ? settings.scales.linkScale(linkTotal) : 0
                })
            })
        })

        // b. Determine link spacing at each node (i.e. start/end points for links)
        Object.entries(settings.linkPos).forEach(([node, connectionObj ]) => {
            const nonZeroObj = connectionObj.filter(d => d.value > 0),
                totalLinks = nonZeroObj.length,
                connectorWidths = connectionObj.map(d => d.linkWidth),
                cumWidths = helpers.cumsum(connectorWidths),
                linkSpacing = connectorWidths.map(d => d > 0 ? settings.geometry.linkSpacing : 0),
                cumLinkSpacing = helpers.cumsum(linkSpacing),
                totalConnectorSpan = d3.sum(connectorWidths) + settings.geometry.linkSpacing * totalLinks,                    
                connectorSpacing = cumWidths.map((d, i, array) => i === 0 ? connectorWidths[i] / 2  
                    : connectorWidths[i] / 2 + array[i-1] + settings.geometry.linkSpacing * i  )

            // console.log(node, totalLinks, totalConnectorSpan, connectionObj, connectorWidths, cumWidths, cumLinkSpacing, connectorSpacing )
            connectionObj.forEach((linkObj, i) => {
                linkObj.dx = 0
                linkObj.dy = connectorSpacing[i] - totalConnectorSpan / 2  
            })
        })

    }; // end setLinkPositions()


    //////////////////////////////////////////////////
    /// GENERAL UPDATE VIS FOR NEW DATA/DATE RANGE ///
    //////////////////////////////////////////////////

    vis.flow.methods.scene.intro = async(duration) => {
        // Set onload element visibilty 
        d3.selectAll(` 
                .link.collection_destination, 
                .link.destination_collection, 
                .link.destination_landfill, 
                .landfill-arrow,
                .annotation-linkPaths-group, 
                .linkLabel, 
                .title-label-group.recycling,
                .illustration-isometric-layer,
                .illustration-collection-layer, 
                .node-group.source .node-group,
                .node-group.target .node-group
            `)
            .style('opacity', 0)

        // No pointer events
       vis.flow.methods.anim.blockEvents(null)

        // Into animation settings
        vis.flow.state.step = 'step-1'
        vis.flow.methods.anim.setVerticalNodeAxis(false, duration, true)
        vis.flow.methods.anim.setAnnotation()
        vis.flow.state.verticalNodePos = false

        // Reveal the date and stepper selectors
        d3.selectAll('.date-selector-container, .stepper-container')
            .transition().duration(duration)
            .style('opacity', null)
    };

    vis.flow.methods.updateVis = async(duration = settings.animation.updateDuration) => {

        /////////////////////////////////
        /// UPDATE APPLICATION STATE  ///
        /////////////////////////////////

            // 1. Set the updated date from the selectors
            let fromDate = document.getElementById('fromDate').value,
                fromDateIndex = vis.flow.data.lists.month.indexOf(fromDate),
                toDate = document.getElementById('toDate').value,
                toDateIndex = vis.flow.data.lists.month.indexOf(toDate)

            // 2. Make sure date range is at least one month
            if(toDateIndex > fromDateIndex){
                toDateIndex = fromDateIndex
                document.getElementById('toDate').value = document.getElementById('fromDate').value
            }

            const noMonths = fromDateIndex - toDateIndex + 1,
                monthLabel = `${noMonths} month`

            // 3. Update the month counter label
            document.getElementById('monthsLabel').innerHTML = monthLabel

            // 4. Update the state variable
            vis.flow.state.dateRange.from   = vis.flow.data.lists.date[fromDateIndex]
            vis.flow.state.dateRange.to     = vis.flow.data.lists.date[toDateIndex]

            // 5. Pause all interactions during transition
            d3.select(`#${settings.svgID}`).style('pointer-events', 'none')
            setTimeout(() => { d3.select(`#${settings.svgID}`).style('pointer-events', null)}, settings.animation.updateDuration + 50)


        ////////////////////////
        /// UPDATE FLOW VIS  ///
        ////////////////////////

        // 1. Update chart data
            vis.flow.data.chartData = vis.flow.data.chart.filter(d => +d.date >=     vis.flow.state.dateRange.from && +d.date <= vis.flow.state.dateRange.to)

        // 2. Reset scales for maximum chart data value
            await vis.flow.methods.setScales()

        // 3. Update node positions and node sizes
            // i. Variables (mutatable) to vertically position each source and target nodes as they are looped over
            let currentSourceY = settings.dims.margin.top + settings.geometry.nodeOffset.sourceY,
                currentTargetY = settings.dims.margin.top + settings.geometry.nodeOffset.targetY

            // ii.  Update master node points for sources and append nodes and node labels 
            settings.nodeSize.source.forEach( obj => {
                const material =  Object.keys(obj)[0],
                    labelIndex = settings.nodes.sources.map(d => d.name).indexOf(material), 
                    label = settings.nodes.sources.map(d => d.label)[labelIndex],
                    value = Object.values(obj)[0],
                    radius = settings.scales.nodeRadScale(value),
                    xPos = settings.geometry.nodeGroupPos.sources.x,
                    yPos =  currentSourceY + radius   

                // a. Move node and resize
                d3.select(`#${helpers.slugify(material)}-node`)
                    .transition().duration(duration)
                        .attr('r', radius)
                        .attr('cx', xPos)
                        .attr('cy', yPos)

                // b. Move and resize the circular node label                
                d3.select(`#${helpers.slugify(material)}-labelPath`)
                    .transition().duration(duration)
                    .attr('d', settings.generators.circleClockwise({x: xPos, y: yPos}, radius + settings.geometry.nodeCircularLabelOffset ) )

                // c. Move the total label group for the source
                d3.select(`#${helpers.slugify(material)}-totalLabel-group`)
                    .transition().duration(duration)
                    .attr('transform', `translate(${xPos}, ${yPos})`)

                // d. Update the total label for the source 
                d3.select(`#${helpers.slugify(material)}-totalLabel`)
                    .transition().duration(duration)
                    .tween('text', function(d){
                        const currentValue = +this.textContent.replace(/\$|,/g, '')
                        let i = d3.interpolate(currentValue, value);
                        return function(t){  
                            d3.select(this).text(helpers.numberFormatters.formatComma(i(t)))  
                        };
                    });

                // e. Update nodePos object and track y position
                settings.nodePos.source[material] = {x: xPos, y: yPos, radius: radius, volume: value}
                currentSourceY = yPos + settings.scales.nodeRadScale(value) + settings.geometry.nodeSpacing.source  // add radius of prior circle + buffer
            })

            settings.nodeSize.target.forEach( obj => {
                const target = Object.keys(obj)[0], 
                    value = Object.values(obj)[0],
                    radius = settings.scales.nodeRadScale(value),
                    xPos = settings.geometry.nodeGroupPos.targets.x,
                    yPos =  currentTargetY + settings.scales.nodeRadScale(value)   // radius of current circle

                // a. Move node and resize
                d3.select(`#${helpers.slugify(target)}-node`)
                    .datum({ label: target,  value: value })
                    .transition().duration(duration)
                    .attr('r', radius)
                    .attr('cx', xPos)
                    .attr('cy', yPos)

                // b. Move and resize the circular node label   
                d3.select(`#${helpers.slugify(target)}-labelPath`)
                    .transition().duration(duration)
                    .attr('d', settings.generators.circleClockwise({x: xPos, y: yPos}, radius + settings.geometry.nodeCircularLabelOffset ) )

                // c. Move the total label group for the target
                d3.select(`#${helpers.slugify(target)}-totalLabel-group`)
                    .transition().duration(duration)
                    .attr('transform', `translate(${xPos}, ${yPos})`)

                // d. Update the total label for the target 
                d3.select(`#${helpers.slugify(target)}-totalLabel`)
                    .transition().duration(duration)
                    .tween('text', function(d){
                        const currentValue = +this.textContent.replace(/\$|,/g, '')
                        let i = d3.interpolate(currentValue, value);
                        return function(t){  
                            d3.select(this).text(helpers.numberFormatters.formatComma(i(t)))  
                        };
                    });

                settings.nodePos.target[target] = {x: xPos, y: yPos, radius: radius}
                currentTargetY = yPos + settings.scales.nodeRadScale(value) + settings.geometry.nodeSpacing.target // add radius of prior circle + buffer
            })    

            // iii. If in horizontal mode, update the translations
            if(!vis.flow.state.verticalNodePos){
                d3.selectAll('.node-group.source .node-group')
                    .transition().duration(duration)
                        .style('opacity', null)
                        .style('transform', function(d, i){
                            const nodeData = JSON.parse(this.getAttribute('node-data'))
                            return `scale(1.65) translate(
                                ${nodeData.yPos - settings.dims.height * 0.45}px, 
                                ${settings.dims.height * 0.2 - nodeData.yPos - nodeData.radius}px)`
                        })
                d3.selectAll('.node-group.target .node-group')
                    .transition().duration(duration)
                        .style('opacity', null)
                        .style('transform', function(d, i){
                            const nodeData = JSON.parse(this.getAttribute('node-data'))
                            return `scale(1.65) translate(  
                                ${-settings.dims.width * 0.6 + nodeData.yPos - settings.dims.height * 0.25}px, 
                                ${settings.dims.height * 0.575 - nodeData.yPos - nodeData.radius}px)`
                        })
            }

        // 4. Update the links
            // a. Call function to determine set link position data
            await vis.flow.methods.setLinkPositions() 

            // b. Update links and link labels
            let currentReturnX1   = settings.geometry.nodeGroupPos.targets.x + settings.geometry.returnLinks.targetXOffset, 
                currentReturnX0   = settings.geometry.nodeGroupPos.sources.x + settings.geometry.returnLinks.sourceXOffset,
                currentReturnY    = settings.geometry.returnLinks.yOffset,
                returnCurveRadius = settings.geometry.returnLinks.curveRadius,
                landfillArrowXEnd = settings.geometry.nodeGroupPos.targets.x + settings.geometry.returnLinks.targetXOffset,
                currentContaminationReturnX = settings.geometry.nodeGroupPos.targets.x + settings.geometry.returnLinks.targetXOffset,
                currentContaminationReturnYOffset = 0

            Object.entries(settings.nodePos.source).forEach(([source, sourceNode ]) => {
                Object.entries(settings.nodePos.target).forEach(([target, targetNode ]) => {
                    const material = settings.nodes.sources.map(d => d.label)[settings.nodes.sources.map(d => d.name).indexOf(source)],
                        destination = settings.nodes.targets.map(d => d.label)[settings.nodes.targets.map(d => d.name).indexOf(target)],
                        total = d3.sum(vis.flow.data.chartData.filter(d => d.source === source && d.target=== target).map(d => d.value))

                        const sourcePosObj = settings.linkPos[source].filter(d=> d.connection === target)[0],
                            targetPosObj = settings.linkPos[target].filter(d=> d.connection === source)[0],
                            nodeStart    = [sourceNode.x + sourcePosObj.dx, sourceNode.y + sourcePosObj.dy],
                            linkOffset1  = [sourceNode.x + sourcePosObj.dx + settings.geometry.nodeGroupPos.sources.offset, sourceNode.y + sourcePosObj.dy],
                            nodeEnd      = [targetNode.x + targetPosObj.dx, targetNode.y + targetPosObj.dy],
                            linkOffset2  = [targetNode.x + targetPosObj.dx + settings.geometry.nodeGroupPos.targets.offset, targetNode.y + targetPosObj.dy],
                            points       = {source: linkOffset1, target: linkOffset2},
                            linkPath     = `M${nodeStart[0]},${nodeStart[1]} L${settings.generators.linkHorizontal(points).slice(1)}  L${nodeEnd[0]},${nodeEnd[1]}`

                        // i. Update source to target path
                        d3.select(`#${helpers.slugify(source)}__${helpers.slugify(target)}`)
                            .transition().duration(duration)
                            .attr('d', linkPath)
                            .attr('volume', total)
                            .style('stroke-width', total === 0 ? 0 : settings.scales.linkScale(total))

                        // ii. Update source to target annotation path
                        d3.select(`#annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`)
                            .transition().duration(duration)
                            .attr('d', linkPath)

                        /// iii. Update source side label (% of source) and volume into MRF
                        const linkLength = document.getElementById(`annotationPath-${helpers.slugify(source)}__${helpers.slugify(target)}`).getTotalLength(),
                            sourceLabel = total === 0 ? `→ No collected ${source.toLowerCase()} sent to ${target.toLowerCase()}`
                                : `→ ${helpers.numberFormatters.formatPct1dec(total/sourceNode.volume)} of collected ${material.toLowerCase()} sent to ${target.toLowerCase()} (${helpers.numberFormatters.formatComma(total)} tonnes) → `,
                            targetLabel = total === 0 ? `No ${source.toLowerCase()} received →`
                                : `${helpers.numberFormatters.formatComma(total)} tonnes of ${source.toLowerCase()} received →`

                        d3.select(`#sourceLabel-${helpers.slugify(source)}__${helpers.slugify(target)} textPath`)
                            .text(sourceLabel)

                        // iv. Update Target to source "return" and to contamination link
                        if(target.toLowerCase() !== 'landfill' && source.toLowerCase() !== 'contamination'){
                            // a. Adjust for current line thickness (half link thickness)
                            currentReturnX1 += (settings.scales.linkScale(total)/2)
                            currentReturnX0 -= (settings.scales.linkScale(total)/2)
                            currentReturnY  -= (settings.scales.linkScale(total)/2)
                            // b. Create link path
                            const returnLinkPath = 
                                `M${nodeEnd[0]},${nodeEnd[1]} 
                                L${currentReturnX1},${nodeEnd[1]}                                 
                                q${returnCurveRadius},0 ${returnCurveRadius},${-returnCurveRadius}  
                                L${currentReturnX1+returnCurveRadius}, ${currentReturnY}
                                q0,${-returnCurveRadius} ${-returnCurveRadius},${-returnCurveRadius}  
                                L${currentReturnX0}, ${currentReturnY-returnCurveRadius}
                                q${-returnCurveRadius},0 ${-returnCurveRadius},${returnCurveRadius}  
                                L${currentReturnX0-returnCurveRadius}, ${nodeStart[1]-returnCurveRadius}
                                q0,${returnCurveRadius} ${returnCurveRadius},${returnCurveRadius}
                                L${nodeStart[0]}, ${nodeStart[1]}
                                `

                            // c. Add link as part of group with gradient
                            d3.select(`#${helpers.slugify(target)}__${helpers.slugify(source)}`)
                                .datum({value: total})
                                .attr('volume', total)
                                .transition().duration(duration)
                                    .attr('d', returnLinkPath)
                                    .style('stroke-width', total === 0 ? 0 : settings.scales.linkScale(total))

                            d3.select(`#annotationPath-${helpers.slugify(target)}__${helpers.slugify(source)}`)
                                .transition().duration(duration)
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
                            const contaminationLandfill = 
                                `M${nodeEnd[0]},${nodeEnd[1]} 
                                L${currentContaminationReturnX},${nodeEnd[1]}                                 
                                q${returnCurveRadius},0 ${returnCurveRadius},${returnCurveRadius}  
                                L${currentContaminationReturnX+returnCurveRadius},${settings.nodePos.target.Landfill.y + currentContaminationReturnYOffset}  
                                q0,${returnCurveRadius} ${-returnCurveRadius},${returnCurveRadius} 
                                L${settings.nodePos.target.Landfill.x},${settings.nodePos.target.Landfill.y + currentContaminationReturnYOffset + returnCurveRadius}  
                                `

                            d3.select(`#${helpers.slugify(target)}__landfill`)
                                .transition().duration(duration)
                                    .attr('d', contaminationLandfill)
                                    .style('stroke-width', total === 0 ? 0 : settings.scales.linkScale(total))

                            d3.select(`#annotationPath-${helpers.slugify(target)}__landfill`)
                                .transition().duration(duration)
                                .attr('d', contaminationLandfill)

                            currentContaminationReturnX -= (settings.scales.linkScale(total)/2) + 5
                            currentContaminationReturnYOffset -= (settings.scales.linkScale(total)/2) + 5

                            // d. Landfill directional arrow
                            d3.select(`#landfill-arrow-1-${helpers.slugify(target)}`)
                                .transition().duration(duration)
                                .attr('transform', `translate(${currentContaminationReturnX - 30}, ${nodeEnd[1] - settings.scales.linkScale(total/2) - 5 }) scale(${2})`)
                            d3.select(`#landfill-arrow-2-${helpers.slugify(target)}`)
                                .transition().duration(duration)
                                .attr('transform', `translate(${currentContaminationReturnX - 30}, ${nodeEnd[1] + settings.scales.linkScale(total/2) + 5}) scale(${2})`)
                        } 
                })
            })

            // c. Update additional nodes and labels
                // i. Contaminated Local reprocessing to landfill annotation
            const contaminatedLocalReprocessingTotal = +d3.select('#contamination__local-reprocessing').attr('volume'),
                contaminatedLocalReprocessingBBox  = document.getElementById('local-reprocessing__landfill').getBBox(),
                contaminatedLocalReprocessingText = contaminatedLocalReprocessingTotal === 0 ? `No locally reprocessed resources sent to landfill`
                    : `${helpers.numberFormatters.formatComma(contaminatedLocalReprocessingTotal)} tonnes sent to landfill`

            d3.select(`#targetLabel-local-reprocessing__contamination`)
                .attr('x', contaminatedLocalReprocessingBBox.x + contaminatedLocalReprocessingBBox.width)
                .attr('y', contaminatedLocalReprocessingBBox.y + contaminatedLocalReprocessingBBox.height * 0.15)
                .text(contaminatedLocalReprocessingText)
                .call(helpers.textWrap, 160, 1.1)

            // ii. Contaminated export to landfill annotation
            const contaminatedExportTotal = +d3.select('#contamination__export').attr('volume'),
                contaminatedExportBBox  = document.getElementById('export__landfill').getBBox(),
                contaminatedExportText = contaminatedExportTotal === 0 ? `No export resources sent back to landfill`
                    : `${helpers.numberFormatters.formatComma(contaminatedExportTotal)} tonnes of contamination were sent to landfill`

            d3.select(`#targetLabel-export__contamination`)
                .attr('x', contaminatedExportBBox.x + contaminatedExportBBox.width)
                .attr('y', contaminatedExportBBox.y + contaminatedExportBBox.height/3)
                .text(contaminatedExportText)
                .call(helpers.textWrap, 160, 1)

        // Update the system illustration
        const landfillVolume = settings.nodeSize.target.filter(d => Object.keys(d)[0] === 'Landfill')[0].Landfill,
             totalCollected = d3.sum(settings.nodeSize.target.map(d => Object.values(d)[0]) )

        d3.select('#system-contamination-pct')
            .transition().duration(duration)
            .tween('text', function(d){
                const currentValue = +this.textContent.replace(/\%|,/g, '') / 100
                let i = d3.interpolate(currentValue, landfillVolume/totalCollected);
                return function(t){  
                    d3.select(this).text(helpers.numberFormatters.formatPct1dec(i(t)))  
                };
            });
        d3.select('#system-recovery-volume')
            .transition().duration(duration)
            .tween('text', function(d){
                const currentValue = +this.textContent.replace(/\$|,/g, '')
                let i = d3.interpolate(currentValue, totalCollected - landfillVolume);
                return function(t){  
                    d3.select(this).text(`${helpers.numberFormatters.formatComma(i(t))}`)  
                };
            });


    }; // end updateVis()



    ///////////////////////////////////////////////
    /// ELEMENT ANIMATION / TRANSITION METHODS  ///
    ///////////////////////////////////////////////

    // Block all interaction during intro animation/transition
    vis.flow.methods.anim.blockEvents = function(duration){
        d3.selectAll(`#${settings.svgID} *`).style('pointer-events', 'none') 
        if(duration){
            setTimeout(() => { 
                d3.selectAll(`#${settings.svgID} *`).style('pointer-events', null)}, 
            duration)
        }
    }; // end blockEvents()

    vis.flow.methods.anim.animatePath = (pathID, forward = true, duration = settings.animation.updateDuration, delay = 0, ease = d3.easeCubicIn) => {
        const pathLength = document.getElementById(pathID).getTotalLength()
        d3.select(`#${pathID}`)
            .style('opacity', null)
            .style('stroke-dasharray',  `${pathLength} ${pathLength}`)
            .style('stroke-dashoffset',  forward ? pathLength : 0)
            .transition().duration(duration).delay(delay).ease(ease)
            .style('stroke-dashoffset', forward ?  0 : pathLength )
    }; // end animatePath()

    vis.flow.methods.anim.setVerticalNodeAxis = function(vertical = true, duration = settings.animation.updateDuration, introAnim = false){
        // 1. Move to vertical
        if(vertical){
            // a Reset to default transforms
            d3.selectAll(`.node-group.source .node-group, .node-group.target .node-group`)
                .transition().duration(duration)
                .style('transform', null)

        // 2. Move to horizontal positioning 
        } else {
            // b. Move the collection (source) nodes
            d3.selectAll('.node-group.source .node-group')
                .style('transform', function(d, i){
                    const nodeData = JSON.parse(this.getAttribute('node-data'))
                    return introAnim ? `scale(1) translate(${0}px, ${settings.dims.height * 0.4 - nodeData.yPos - nodeData.radius}px)` : null
                })
                .transition().duration(duration)
                    .style('opacity', null)
                    .style('transform', function(d, i){
                        const nodeData = JSON.parse(this.getAttribute('node-data'))
                        return `scale(1.65) translate(
                            ${nodeData.yPos - settings.dims.height * 0.45}px, 
                            ${settings.dims.height * 0.2 - nodeData.yPos - nodeData.radius}px)`
                    })
            // c. Move the destination (target) nodes
            d3.selectAll('.node-group.target .node-group')
                .style('transform', function(d, i){
                    const nodeData = JSON.parse(this.getAttribute('node-data'))
                    return introAnim ? `translate(${0}px, ${settings.dims.height * 0.75 - nodeData.yPos - nodeData.radius}px)` : null
                })
                .transition().duration(duration)
                    .style('opacity', null)
                    .style('transform', function(d, i){
                        const nodeData = JSON.parse(this.getAttribute('node-data'))
                        return `scale(1.65) translate(  
                            ${-settings.dims.width * 0.6 + nodeData.yPos - settings.dims.height * 0.25}px, 
                            ${settings.dims.height * 0.575 - nodeData.yPos - nodeData.radius}px)`
                    })
        }
    }; // end setVerticalNodeAxis()

    vis.flow.methods.anim.setAnnotation = function(step = vis.flow.state.step, duration){
        // Control the position the Collection, Destination and Recycling labels
        switch(step){
            case 'step-1': // Horizontal node intro scene
                d3.select(`.title-label-group.collection`).style('opacity', null)
                    .transition().duration(duration)
                    .attr('transform', `scale(1.25) translate(
                        ${settings.geometry.nodeGroupPos.sources.x - settings.geometry.nodeGroupPos.targets.x * 0.05}, 
                        ${settings.dims.margin.top + settings.dims.height * 0.175})`
                    )
                d3.select(`.title-label-group.destination`).style('opacity', null)
                    .transition().duration(duration)
                    .attr('transform', `scale(1.25) translate(
                        ${settings.geometry.nodeGroupPos.targets.x * 0.825}, 
                        ${settings.dims.margin.top + settings.dims.height* 0.35})`
                    )
                d3.select('.title-label-group.recycling').style('pointer-events', 'none')
                    .transition().duration(duration)
                    .style('opacity', 0)
                d3.select('#step-annotation').style('pointer-events', 'none')
                    .transition().duration(duration)
                    .style('opacity', null)

                // Reset commentary annotation
                d3.select('#step-annotation').transition().duration(duration * 0.25)
                    .style('opacity', 0)
                setTimeout(() => {
                    d3.select('#step-annotation')
                        .text(settings.annotation.commentary['step-1'])
                        .transition().duration(duration * 0.75)
                            .attr('transform', null)
                            .style('opacity', null)                    
                }, duration * 0.25);

                // Move collection and destination labels, and transition arrows
                d3.select('.node-group-arrow.upper.collection').transition().duration(duration)
                    .attr('transform', `translate(0, -58) scale(5)`)
                d3.select('.node-group-arrow.lower.collection').transition().duration(duration)
                    .attr('transform', `translate(0, 18) scale(5)`)
                break

            case 'step-2': // Vertical node 'default' view for Collection and destination
                d3.select('.title-label-group.collection')
                    .transition().duration(duration)
                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x}, ${settings.dims.margin.top} )`)
                d3.select('.title-label-group.destination')
                    .transition().duration(duration)
                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x}, ${settings.dims.margin.top} )`)
                d3.selectAll('.title-label-group.recycling').style('pointer-events', 'none')
                    .transition().duration(duration)
                    .style('opacity', 0)

                // Move collection and destination labels, and transition arrows
                d3.select('.node-group-arrow.upper.collection').transition().duration(duration)
                    .attr('transform', `translate(0, -58) scale(5)`)
                d3.select('.node-group-arrow.lower.collection').transition().duration(duration)
                    .attr('transform', `translate(0, 18) scale(5)`)

                // Move and update commetary
                d3.select('#step-annotation').transition().duration(duration * 0.5)
                    .attr('transform', `translate(0, -${settings.dims.height * 0.225})`)
                    .style('opacity', 0)
                setTimeout(() => {
                    d3.select('#step-annotation')
                        .text(settings.annotation.commentary['step-2'])
                        .transition().duration(duration * 0.5)
                            .attr('transform', `translate(0, -${settings.dims.height * 0.45})`)
                            .style('opacity', null)                    
                }, duration * 0.5);

                break

            case 'step-3': // Circular flow view
                d3.select('.title-label-group.recycling').style('pointer-events', null)
                    .transition().duration(duration)
                    .style('opacity', null)
                d3.select('.title-label-group.collection')
                    .transition().duration(duration)
                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x}, ${settings.dims.height - settings.dims.margin.top * 0.15})`)
                d3.select('.title-label-group.destination')
                    .transition().duration(duration)
                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x}, ${settings.dims.height - settings.dims.margin.top * 0.15} )`)
                d3.selectAll('#step-annotation').style('pointer-events', 'none')
                    .transition().duration(duration)
                    .style('opacity', 0)

                // Move collection and destination labels, and transition arrows
                d3.select('.node-group-arrow.upper.collection').transition().duration(duration)
                    .attr('transform', `translate(0, -58) scale(5)`)
                d3.select('.node-group-arrow.lower.collection').transition().duration(duration)
                    .attr('transform', `translate(0, 18) scale(5)`)


                d3.selectAll('#step-annotation').style('pointer-events', 'none')
                    .transition().duration(duration)
                    .style('opacity', 0)

                break

            case 'step-4': // Isometric system view
                const nodePosSourceY = (d3.max(Object.values(settings.nodePos.source).map(d=> d.y)) - d3.min(Object.values(settings.nodePos.source).map(d=> d.y))) / 2 + d3.min(Object.values(settings.nodePos.source).map(d=> d.y)),
                nodePosTargetY = (d3.max(Object.values(settings.nodePos.target).map(d=> d.y)) - d3.min(Object.values(settings.nodePos.target).map(d=> d.y))) / 2 + d3.min(Object.values(settings.nodePos.target).map(d=> d.y))

                // Move collection and destination labels, and transition arrows
                d3.select('.title-label-group.recycling').style('pointer-events', null)
                    .transition().duration(duration)
                    .style('opacity', null)
                d3.select('.title-label-group.collection').transition().duration(duration)
                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.sources.x - 150}, ${nodePosSourceY}) rotate(-90)`)
                d3.select('.title-label-group.destination').transition().duration(duration)
                    .attr('transform', `translate(${settings.geometry.nodeGroupPos.targets.x + 250}, ${nodePosTargetY - 300}) rotate(-90)`)

                d3.select('.node-group-arrow.upper.collection').transition().duration(duration)
                    .attr('transform', `translate(200, -10) scale(5) rotate(90)`)
                d3.select('.node-group-arrow.lower.collection').transition().duration(duration)
                    .attr('transform', `translate(-200, -10) scale(5) rotate(90)`)
                d3.selectAll('.title-label.destination, .node-group-arrow.destination')
                    .transition().duration(250)
                    .style('opacity', 0)

                setTimeout( () => {
                    d3.select('.title-label.destination').html('Recovered materials')
                    d3.selectAll('.title-label.destination, .node-group-arrow.destination')
                        .transition().duration(250)
                        .style('opacity', null)
                }, 250)    

                d3.selectAll('#step-annotation').style('pointer-events', 'none')
                    .transition().duration(duration)
                    .style('opacity', 0)
                break

            default: 
                
        }
    }; // end setAnnotation()

    vis.flow.methods.anim.setPointerEvents = function(step = vis.flow.state.step){
        // Control the interactions (pointer-events) available on each scene and during transitions
        switch(step){
            case 'step-1': // Horizontal node intro scene
                vis.flow.methods.anim.blockEvents(null)         // No events
                d3.selectAll(` 
                        .link.collection_destination, 
                        .link.destination_collection, 
                        .link.destination_landfill, 
                        .landfill-arrow,
                        .annotation-linkPaths-group, 
                        .linkLabel, 
                        .title-label-group.recycling,
                        .illustration-isometric-layer,
                        .illustration-collection-layer, 
                        .node-group
                    `)
                    .style('pointer-events', 'none')

                break

            case 'step-2': // Vertical node 'default' view for Collection and destination
                vis.flow.methods.anim.blockEvents(settings.animation.updateDuration)        
                setTimeout(() => {
                    d3.selectAll('.link.destination_collection, .title-label-group.recycling')
                        .style('pointer-events', 'none')
                    d3.selectAll('.link.collection_destination, .link.destination_landfill')
                        .style('pointer-events', 'auto')
                        .style('opacity', null)                    
                }, settings.animation.updateDuration + 10);

                break

            case 'step-3': // Circular flow view
                vis.flow.methods.anim.blockEvents(settings.animation.updateDuration)         // No events

                d3.selectAll('.link.destination_collection')
                    .style('pointer-events', 'auto')
                    .style('opacity', null)

                break

            case 'step-4': // Isometric system view
                vis.flow.methods.anim.blockEvents(settings.animation.updateDuration)         // No events
                break

            default: 
                
        }
    }; // end setPointerEvents()

    vis.flow.methods.anim.drawDestinationLinks = function(forward = true, duration = settings.animation.updateDuration){
        const animOffset = 100,
            offsetDuration = duration - document.querySelectorAll('.link.collection_destination').length * animOffset           
        // a. Draw destination links 
        if(forward){
            document.querySelectorAll('.link.collection_destination').forEach((node, i) => {
                vis.flow.methods.anim.animatePath(node.id, true, offsetDuration, i * animOffset)
            })
            d3.selectAll('.link.destination_landfill, .landfill-arrow')
                .transition().duration(500).delay(duration)
                .style('opacity', null) 
        } else {
        // b. Undraw circular links
            document.querySelectorAll('.link.collection_destination').forEach((node, i) => {
                vis.flow.methods.anim.animatePath(node.id, false, offsetDuration, i * animOffset)
            })
            d3.selectAll('.link.destination_landfill, .landfill-arrow')
                .transition().duration(duration)
                .style('opacity', 0) 
        }
    }; // end drawDestinationLinks()

    vis.flow.methods.anim.drawCircularLinks = function(forward = true, duration = settings.animation.updateDuration){
        const animOffset = 100,
            offsetDuration = duration - document.querySelectorAll('.link.collection_destination').length * animOffset           
        // a. Draw circular links 
        if(forward){
            document.querySelectorAll('.return.link').forEach((node, i) => {
                vis.flow.methods.anim.animatePath(node.id, true, offsetDuration, i * animOffset)
            })
            vis.flow.state.circularFlow = true
        // b. Undraw circular links
        } else {
            document.querySelectorAll('.return.link').forEach(node => {
                vis.flow.methods.anim.animatePath(node.id, false, duration, 0)
            })
            vis.flow.state.circularFlow = false
        }
    }; // end drawCircularLinks()

    vis.flow.methods.anim.showIsometric = async(show = true, duration = 3000) => {
        // a. 2D to Isometric
        if(show){
            d3.selectAll('.l1.layer').classed('isometric', true)
            // Show the illustrations
            d3.select('.illustration-isometric-layer').transition().duration(duration)
                .style('opacity', null)

        // b. Isometric to 2D
        } else {
            const nodePosY = vis.flow.state.circularFlow ? settings.dims.height - settings.dims.margin.top/4 : settings.dims.margin.top 
            d3.selectAll('.layer').classed('isometric', false)
            // Hide the illustrations
            d3.select('.illustration-isometric-layer').transition().duration(duration)
                .style('opacity', 0)
        }
        // c. Update state
        vis.flow.state.isometric = !vis.flow.state.isometric 
    }; // end showIsometric()


    vis.flow.methods.anim.drawBin = function(forward = true, duration = 2000){
        d3.select('.illustration-collection-layer').style('opacity', null)
        document.querySelectorAll('.bin-illustration-group path').forEach(path => { 
            vis.flow.methods.anim.animatePath(path.id, forward, duration, 20, d3.easeCubicInOut)
        })
        if(!forward){ setTimeout(() => {
            d3.select('.illustration-collection-layer').style('opacity', 0)        
        }, duration);}
    };


    ////////////////////////////
    /// SETUP THE INTERFACE  ///
    ////////////////////////////

    vis.flow.methods.setInterface = async() => {
        // Set date dropdown
        vis.flow.data.lists.date = vis.flow.data.lists.month.reverse()
        vis.flow.data.lists.month = vis.flow.data.lists.date.map(d => helpers.numberFormatters.formatMonth(d))
        vis.flow.data.lists.month.forEach((date, i) => {
            d3.selectAll('#fromDate, #toDate').append('option')
                .attr('value', date).html(date)
        })

        // Update date range
        const dateFromIndex = vis.flow.state.dateRange.from ? vis.flow.data.lists.month.indexOf(vis.flow.state.dateRange.from) : 0,
            dateToIndex = vis.flow.state.dateRange.to ? vis.flow.data.lists.month.indexOf(vis.flow.state.dateRange.to) : 0
        if(!vis.flow.state.dateRange.from || !vis.flow.state.dateRange.to){
            vis.flow.state.dateRange.from = vis.flow.data.lists.month[dateFromIndex]
            vis.flow.state.dateRange.to = vis.flow.data.lists.month[dateToIndex]
        }
        // Setup date selector section
        d3.selectAll('.date-selector').on('change', function(){vis.flow.methods.updateVis()})
        document.getElementById('toDate').value =  vis.flow.state.dateRange.to 
        document.getElementById('fromDate').value = vis.flow.state.dateRange.from 
        d3.select('#monthsLabel').html(`${dateFromIndex - dateToIndex + 1} month`)

    }; // end setInterface()


    vis.flow.methods.addNav = () => {
        // Setup stepper        
        function moveStepper(el){
            d3.selectAll('.stepper-nav li').classed('step-current', false)	
            d3.select(el).classed('step-current', true)	
        }
        // Add stepper events 
        d3.selectAll('.step-item').on( 'click', function(){
            // Transition stepper and record state
            d3.selectAll('.stepper-nav li').classed('step-current', false)	
            d3.select(this).classed('step-current', true)	
            vis.flow.state.step = this.id
            // Transition scene
            switch(this.id){
                case 'step-1': nodeView();                  break   // Horizontal node layout without flows      
                case 'step-2': destinationFlows();          break   // Vertical nodes with collection to destination flows  
                case 'step-3': circularFlowAndExplore();    break  
                case 'step-4': isometricSystemView();       break  
                default: break
            }
            // Set pointer events for each step
            vis.flow.methods.anim.setPointerEvents()
        })

        // Step-1 Node only view: 
        function nodeView() {
            // 0. Move annotation labels 
            vis.flow.methods.anim.setAnnotation(vis.flow.state.step, settings.animation.updateDuration) 
            // 1. Transition nodes to horizontal position
            if(vis.flow.state.verticalNodePos) {
                vis.flow.methods.anim.setVerticalNodeAxis(false) 
                vis.flow.state.verticalNodePos = false
                vis.flow.state.collectionNodes = true
                vis.flow.state.destinationNodes = true
            } 
            // 2. Hide the destination flow links
            if(vis.flow.state.destinationLinks) {
                vis.flow.methods.anim.drawDestinationLinks(false)
                vis.flow.state.destinationLinks = false
            }
            // 3. Hide the circular flow links
            if(vis.flow.state.circularFlow) {
                vis.flow.methods.anim.drawCircularLinks(false)    
                vis.flow.state.circularLinks = false  
            }
            // 4. Hide the isometric view
            if(vis.flow.state.isometric) {
                vis.flow.methods.anim.showIsometric(false) 
                vis.flow.state.isometric = false
            }

        };

        // Step-2 Collection to Destination
        function destinationFlows() {
            // 0. Move annotation labeas 
            vis.flow.methods.anim.setAnnotation(vis.flow.state.step, settings.animation.updateDuration) 

            // 1. Transition nodes to vertical position
            if(!vis.flow.state.verticalNodePos) {
                vis.flow.methods.anim.setVerticalNodeAxis(true) 
                vis.flow.state.verticalNodePos = true
            } 
            // 2. Show the destination flow links
            if(!vis.flow.state.destinationLinks) {
                vis.flow.methods.anim.drawDestinationLinks(true)
                vis.flow.state.destinationLinks = true
            }
            // 3. Hide the circular flow links
            if(vis.flow.state.circularFlow){
                vis.flow.methods.anim.drawCircularLinks(false)   
                vis.flow.state.circularLinks = false   
            }
            // 4. Hide the isometric view
            if(vis.flow.state.isometric) {
                vis.flow.methods.anim.showIsometric(false) 
                vis.flow.state.isometric = false
            }
        }; // end destinationFlows()


        // Step-3 Show Circular links and explore
        function circularFlowAndExplore() {
            // 0. Move annotation labels 
            vis.flow.methods.anim.setAnnotation(vis.flow.state.step, settings.animation.updateDuration) 

            // 1. Transition nodes to vertical position
            if(!vis.flow.state.verticalNodePos) {
                vis.flow.methods.anim.setVerticalNodeAxis(true) 
                vis.flow.state.verticalNodePos = true
            } 
            // 2. Show the destination flow links
            if(!vis.flow.state.destinationLinks) {
                vis.flow.methods.anim.drawDestinationLinks(true)
                vis.flow.state.destinationLinks = true
            }
            // 3. Show the circular flow links
            if(!vis.flow.state.circularFlow) {
                vis.flow.methods.anim.drawCircularLinks(true)
                vis.flow.state.circularFlow = true  
            }
            // 4. Hide the isometric view
            if(vis.flow.state.isometric) {
                vis.flow.methods.anim.showIsometric(false) 
                vis.flow.state.isometric = false
            }
        };

        // Step-4 Show isometric view
        function isometricSystemView() {
            // 0. Move annotation labels 
            vis.flow.methods.anim.setAnnotation(vis.flow.state.step, settings.animation.updateDuration) 

            // 1. Transition nodes to vertical position
            if(!vis.flow.state.verticalNodePos) {
                vis.flow.methods.anim.setVerticalNodeAxis(true) 
                vis.flow.state.verticalNodePos = true
            } 
            // 2. Show the destination flow links
            if(!vis.flow.state.destinationLinks) {
                vis.flow.methods.anim.drawDestinationLinks(true)
                vis.flow.state.destinationLinks = true
            }
            // 3. Show the circular flow links
            if(!vis.flow.state.circularFlow) {
                vis.flow.methods.anim.drawCircularLinks(true)
                vis.flow.state.circularFlow = true  
            }
            // 4. Show the isometric view
            if(!vis.flow.state.isometric) {
                vis.flow.methods.anim.showIsometric(true) 
                vis.flow.state.isometric = true
            }
        };
    }; // end addNav()



    ///////////////////////////
    /// X. HELPER FUNCTIONS ///
    ///////////////////////////

    const helpers= {
        numberFormatters: {
            formatComma:           	d3.format(",.0f"),
            formatComma1dec:       	d3.format(",.1f"),
            formatComma2dec:       	d3.format(",.2f"),
            formatInteger:         	d3.format(".0f"),   
            formatCostInteger:     	d3.format("$,.0f"),  
            formatCost1dec:        	d3.format("$,.1f"),  
            formatPct:          	d3.format(".0%"), 
            formatPct1dec:          d3.format(".1%"),
            formatMonth:            d3.timeFormat("%b-%Y"),
            formatDateSlash:        d3.timeFormat("%d/%m/%Y")
        },
        numberParsers: {
            parseDateSlash:         d3.timeParse("%d/%m/%Y"),
        },
        slugify: function (str) {
            str = str.replace(/^\s+|\s+$/g, '').toLowerCase(); // trim           
            const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;",      // remove accents, swap ñ for n, etc
                to   = "aaaaeeeeiiiioooouuuunc------"
            for (var i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes
            return str;
        }, 
        textWrap: function(text, width, lineHeight, centerVertical = false) {
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
        }, 
        cumsum: (values, valueof) => {
            var sum = 0, index = 0, value;
            return Float64Array.from(values, valueof === undefined
                ? v => (sum += +v || 0)
                : v => (sum += +valueof(v, index++, values) || 0));
        },
        getCSSVarHex: (varName) =>  getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim(),
        changeHex: (hex, amount) => {
            let usePound = false;  
            if (hex[0] === "#") {
                hex = hex.slice(1);
                usePound = true;
            }
        
            let num = parseInt(hex, 16),
                r = (num >> 16) + amount,
                b = ((num >> 8) & 0x00FF) + amount,
                g = (num & 0x0000FF) + amount;
        
            // Clamp r, g, b, from 0 to 255
            r = (r > 255) ? 255 : r < 0 ? 0 : r
            b = (b > 255) ? 255 : g < 0 ? 0 : b
            g = (g > 255) ? 255 : b < 0 ? 0 : g

            return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
        }        
    }



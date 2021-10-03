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
                {name: 'Paper and cardboard',   label: 'Paper and cardboard'},
                {name: 'Glass',                 label: 'Glass'},
                {name: 'Plastics',              label: 'Plastics'},
                {name: 'Metals',                label: 'Metals'},
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
        scales:     {},         // Programatically created when max node and link sizes are calculated based on selected date range 
        linkPos:    {},
        palette:    {},            // Programatically created to matched to CSS colours for sources and targets
        queryParameters:    {},     // Objet to stor query string parameters
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
                loadFromTSV()      
                break
            case 'Azure':
                alert('Azure endpoint connections have not been defined') 
                break

            default:
                alert('No data source defined in app settings')
        }

        // HELPERS FOR LOADING
        // Load data from TSV files endpoints 
        function loadFromTSV(config){    

            // 1. Setup and specification of data endpoint tables
            const dataTables =  ['data_mrfOutput']          // Table names matched to the dataEndpointURls object (held in the data-endpoints.js file)

            // 2. Asynchronous data load (with Promise.all) and D3 (Fetch API) 
            Promise.all(
                dataTables.map(d => d3.tsv(dataEndpointURLs[d]) )
            ).then( rawData => {
                // a. Parse each loaded data table and store in data.table object, using the parseTable helper 
                rawData.forEach((tableData, i) => {parseTable(dataTables[i], tableData) })

            }).then( async () => {
                // 3. Initiate vis build sequence with data now loaded
                await vis.flow.methods.parseData(vis.flow.data.tables[settings.tableName], settings)
                await vis.flow.methods.applyQuerySettings()
                await vis.flow.methods.setInterface()
                await vis.flow.methods.setPalette() 
                await vis.flow.methods.renderFlowVis(vis.flow.data.chart, settings)
                vis.flow.methods.addNav() 
            })

            // X. Table data and date parsing function: trim() header white space and prase numbers with "$" and "," stripped. 
            const parseTable = async (tableName, tableData) => {
                vis.flow.data.tables[settings.tableName]  = tableData.map(row => {
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
                    .attr('preserveAspectRatio', 'xMidYMid meet')
                    .attr('aria-labelledby',  'svgTitle svgDesc')
                    .attr('role',  'figure'),
                defs = svg.append('defs'),
                svgTitle = svg.append('title').attr('id','svgTitle'),
                svgDesc = svg.append('desc').attr('id','svgDesc'),
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
                isometricIllustrationLayer = illustrationLayer.append('g').classed('illustration-isometric-layer' , true ),
                titleLayer = annotationLayer.append('g').classed('annotation-titleLabels' , true ),
                directionLayer = annotationLayer.append('g').classed('annotation-direction' , true )

            // b. Call method to programmatically create link gradient fills in SVG defs
            await vis.flow.methods.setGradients(defs, settings)         

            // c. Add title and desc for for screen readers
            const svgTitleText = `A diagram showing the volumes of materials collected (${settings.nodes.sources.map(d => d.name).toString}) and their destination (${settings.nodes.targets.map(d => d.name).toString})`,
                svgDescText = `A diagram showing the volumes of materials collected (${settings.nodes.sources.map(d => d.name).toString}) and their destination (${settings.nodes.targets.map(d => d.name).toString}). Volumes (in tonnes) are shown by default  from ${vis.flow.state.dateRange.from} to ${vis.flow.state.dateRange.to}. These dates can be changed from dropdown menus above the diagram. Various views of the flows between collected material and destination (and their circular return links) are shown by pressing on tab-like buttons, also above the diagram.`

            svgTitle.html(svgTitleText)
            svgDesc.html(svgDescText)

            // Toggle title so that it doesn't appear as a default tooltip
            svg.on('mouseover', () => document.getElementById('svgTitle').innerHTML = null )
                .on('mouseout', () =>  document.getElementById('svgTitle').innerHTML = svgTitleText )


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
                .text('Products made from reprocessed materials')
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
                .attr('y', settings.dims.height * 0.525)
                .attr('dy', 0)
                .text(settings.annotation.commentary['step-1'])


        //-------------- INTRO & SVG ILLUSTRATION LAYER ---//
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
        };

        function groupLabelMouseout(){
            const duration = 50, 
                selection = vis.flow.state.circularFlow 
                    ?`.links-group, .node-group *, .title-label-group, .nodeLabel, .node-group-arrow, .annotation-direction`  
                    : `.links-group, .node-group *, .title-label-group:not(.recycling), .nodeLabel, .node-group-arrow, .annotation-direction`
        };

    }; // renderFlowVis()

    vis.flow.methods.renderIsometricIllustrations = async (layer) => {
        const landfillVolume = settings.nodeSize.target.filter(d => Object.keys(d)[0] === 'Landfill')[0].Landfill,
             totalCollected = d3.sum(settings.nodeSize.target.map(d => Object.values(d)[0]) )

        const icons = {
            arrowUpLeft:        'm-24.981-7.719 5.583 18.235c.001.005.007.007.008.012a.415.415 0 0 0 .019.048c.004.008.003.015.008.023.005.01.016.013.022.022.022.031.045.06.076.083.01.01.02.015.03.023.013.008.023.016.036.022a.388.388 0 0 0 .177.047.395.395 0 0 0 .115-.017c.006-.002.011-.007.018-.01.016-.005.03-.013.045-.02.006-.003.013-.002.019-.005l6.114-3.529 23.74 13.706h.002c.006.004.013.003.019.006a.388.388 0 0 0 .175.046h.002c.064 0 .122-.019.174-.046.007-.003.014-.002.02-.006h.001l13.38-7.725c.015-.01.024-.023.037-.033.022-.017.043-.032.06-.054.017-.019.03-.04.043-.061a.326.326 0 0 0 .049-.147c.001-.017.009-.03.009-.047V.114c0-.008-.004-.015-.005-.023a.413.413 0 0 0-.04-.152c-.004-.008-.004-.015-.008-.023-.004-.007-.011-.01-.015-.017a.438.438 0 0 0-.11-.112c-.008-.004-.012-.011-.019-.015L7.376-10.292v-7.058c0-.009-.004-.016-.005-.023 0-.02-.005-.04-.009-.06-.004-.017-.006-.035-.013-.052a.43.43 0 0 0-.018-.04c-.004-.008-.004-.015-.008-.023-.005-.009-.014-.014-.02-.023-.01-.015-.019-.029-.031-.042-.011-.012-.023-.022-.035-.033a.385.385 0 0 0-.187-.088c-.01-.002-.018-.008-.029-.01l-31.583-3.223c-.008-.001-.016.002-.024.001-.006 0-.012-.004-.019-.004-.02 0-.037.009-.056.012-.02.002-.04 0-.06.005-.006.002-.01.008-.017.01-.026.01-.049.024-.073.04-.02.013-.042.023-.059.04-.018.016-.031.037-.046.057-.011.014-.026.026-.034.041l-.009.021c-.01.021-.014.044-.02.067-.006.022-.016.04-.019.061 0 .007.002.014.001.021 0 .007-.003.013-.003.02v12.739c0 .02.008.038.012.058.004.02 0 .04.007.06zm25.455-6.33c-.007.003-.01.011-.017.014-.023.015-.042.035-.062.055a.436.436 0 0 0-.05.057c-.005.007-.012.011-.016.019-.009.014-.01.03-.015.046a.39.39 0 0 0-.026.076.392.392 0 0 0-.006.075c0 .025.001.05.006.074a.375.375 0 0 0 .026.077c.006.015.007.031.015.046.003.006.01.009.014.014a.38.38 0 0 0 .13.131l.003.001L23.82.114 11.228 7.383l-23.74-13.706c-.008-.004-.015-.004-.023-.008a.593.593 0 0 0-.153-.041c-.007 0-.014-.004-.022-.004-.008 0-.014.004-.022.005a.337.337 0 0 0-.052.006c-.02.003-.037.009-.055.014l-.046.02c-.007.003-.015.003-.022.007l-5.882 3.396-5.264-17.193 29.779 3.04zm-19.1 11.94 5.522-3.188V6.53l-5.522 3.187zm6.312-3.188L10.833 8.067v11.828L-12.314 6.53ZM11.623 8.067l12.59-7.27v11.828l-12.59 7.27Zm-31.04-10.345v10.04l-4.792-15.656v-10.042ZM1.462-13.707l5.126-2.96v5.92z',
            arrowUpRight:       'M-11.03 20.919h.003l23.74-13.707 6.112 3.53c.005.004.013.002.018.005.015.008.03.015.046.02.007.004.011.008.017.01a.386.386 0 0 0 .292-.03c.013-.005.024-.013.037-.022a.395.395 0 0 0 .106-.106c.006-.009.017-.013.023-.022.004-.007.004-.015.007-.022a.323.323 0 0 0 .02-.048c0-.005.006-.007.007-.012l5.585-18.236c.005-.02.003-.039.005-.058.003-.02.012-.038.012-.057v-12.74c0-.006-.003-.012-.004-.02 0-.006.003-.013.002-.02-.002-.02-.013-.04-.019-.06-.006-.024-.01-.047-.02-.069-.003-.006-.005-.014-.009-.02l-.002-.003c-.008-.014-.022-.025-.032-.039-.014-.02-.028-.041-.046-.057-.017-.017-.039-.028-.06-.04a.352.352 0 0 0-.072-.04c-.006-.001-.01-.007-.018-.009-.019-.006-.039-.003-.058-.005-.02-.004-.037-.012-.057-.012-.007 0-.012.003-.019.004-.007 0-.015-.003-.023-.002L-7.02-17.745c-.01.002-.018.007-.029.01a.357.357 0 0 0-.102.03l-.04.025a.422.422 0 0 0-.079.065c-.012.014-.02.028-.03.042-.006.009-.016.014-.021.024-.005.007-.005.015-.008.022-.007.014-.013.026-.018.041-.006.017-.01.035-.013.052-.005.02-.009.04-.01.06 0 .008-.004.014-.004.022v7.059L-24.803-.23c-.008.004-.012.01-.018.016a.42.42 0 0 0-.111.111c-.005.006-.012.01-.016.017-.004.007-.003.015-.007.023a.364.364 0 0 0-.034.1.444.444 0 0 0-.007.053c0 .008-.004.014-.004.022v12.739c0 .016.007.03.01.047a.362.362 0 0 0 .016.08c.008.025.02.045.032.067.013.022.025.043.042.062.018.02.04.037.061.054.013.01.022.023.037.032l13.381 7.726h.002c.006.003.013.002.019.006a.38.38 0 0 0 .174.046h.002a.378.378 0 0 0 .176-.046c.006-.003.013-.003.019-.006zM-.475-13.365h.003a.386.386 0 0 0 .13-.132c.004-.005.011-.007.014-.014.01-.014.01-.03.015-.045a.35.35 0 0 0 .027-.077.392.392 0 0 0 .005-.075c0-.025 0-.05-.005-.074a.338.338 0 0 0-.027-.077c-.006-.015-.006-.031-.015-.046-.004-.007-.01-.01-.015-.017-.015-.023-.034-.04-.053-.06-.019-.019-.036-.037-.057-.05-.008-.006-.012-.013-.019-.017l-5.251-3.033 29.779-3.039L18.79-2.929 12.91-6.324c-.007-.004-.016-.003-.023-.007a.449.449 0 0 0-.102-.035.42.42 0 0 0-.05-.006c-.008 0-.015-.005-.023-.005-.007 0-.014.004-.021.005a.488.488 0 0 0-.107.02.445.445 0 0 0-.047.02c-.007.004-.015.003-.022.007l-23.74 13.706-12.591-7.27Zm24.687 5.47L19.417 7.762V-2.28l4.795-15.657ZM-10.83 8.065 12.317-5.298V6.527L-10.83 19.892ZM13.107-5.298l5.52 3.186V9.716l-5.52-3.189ZM-24.212.796l12.592 7.27v11.826l-12.592-7.27zm17.627-17.464 5.126 2.96-5.126 2.959z',
            arrowDownLeft:      'M-24.999 20.61c.003.023.014.043.02.065.005.02.01.042.017.061.013.027.03.049.048.071.013.016.023.035.038.048.023.022.05.036.076.052.016.01.029.022.046.029.046.018.096.03.147.03l.04-.002L7.02 17.74c.02-.002.037-.012.056-.017.026-.007.051-.013.075-.024.023-.011.041-.026.061-.042.02-.015.041-.029.058-.048s.029-.04.042-.062c.013-.022.026-.042.035-.066.01-.025.012-.05.016-.078.003-.019.012-.036.012-.057v-7.059L24.803.225c.014-.009.023-.022.036-.032.022-.017.043-.033.061-.054.016-.02.029-.04.042-.062a.326.326 0 0 0 .049-.147c.002-.016.01-.03.01-.047v-12.738c0-.008-.005-.015-.006-.023a.413.413 0 0 0-.04-.152c-.004-.007-.004-.015-.008-.023-.004-.007-.011-.01-.015-.018a.292.292 0 0 0-.031-.04c-.013-.015-.026-.027-.04-.04-.013-.011-.025-.022-.04-.031-.007-.005-.01-.012-.018-.016l-13.381-7.725c-.015-.01-.03-.01-.047-.016a.383.383 0 0 0-.076-.026.341.341 0 0 0-.074-.005.38.38 0 0 0-.074.005.341.341 0 0 0-.077.027c-.015.006-.032.007-.046.015l-23.74 13.706-6.112-3.529c-.014-.008-.03-.008-.043-.014-.014-.006-.024-.017-.04-.021-.011-.004-.022-.001-.033-.004a.404.404 0 0 0-.292.052.336.336 0 0 0-.058.046.336.336 0 0 0-.052.06c-.007.01-.017.015-.022.026-.008.014-.009.029-.015.043-.006.014-.016.025-.021.04l-5.582 18.233c-.006.018-.004.04-.006.06-.003.02-.012.036-.012.057V20.57c0 .007.003.013.003.02.001.006-.002.013-.002.02zm6.21-30.424 5.88 3.395h.002c.05.029.105.039.16.044.012 0 .024.009.035.009h.001c.014 0 .027-.01.04-.011a.39.39 0 0 0 .155-.042h.002l23.74-13.706 12.59 7.269L.472.623C.465.626.462.633.455.638a.37.37 0 0 0-.06.053.372.372 0 0 0-.05.058C.338.756.331.76.327.767.32.782.318.798.313.813A.35.35 0 0 0 .287.89C.282.915.282.94.282.965a.308.308 0 0 0 .032.15c.005.016.006.032.014.047.004.006.01.008.014.014a.386.386 0 0 0 .13.13l.004.002L5.725 4.34l-29.779 3.04zM-24.21 8.188 6.585 5.045V16.99l-30.795 3.144zm31.58-3.6c0-.007.004-.013.002-.02 0-.01-.007-.019-.009-.03a.339.339 0 0 0-.032-.103L7.31 4.4a.398.398 0 0 0-.072-.086l-.032-.023c-.01-.008-.016-.018-.028-.025L1.461.965l22.752-13.136V-.345L7.374 9.375V4.609c0-.007-.003-.012-.003-.02z',
            arrowDownRight:     'M24.983 7.718 19.4-10.517c-.005-.016-.016-.028-.023-.043-.005-.013-.006-.027-.013-.04-.006-.01-.015-.014-.02-.023a.435.435 0 0 0-.108-.107.374.374 0 0 0-.075-.036.389.389 0 0 0-.066-.02c-.024-.005-.05-.005-.076-.005a.367.367 0 0 0-.077.008c-.013.003-.023 0-.035.003-.015.004-.024.015-.04.02-.015.007-.029.008-.043.015l-6.112 3.529-23.74-13.704c-.014-.008-.03-.009-.044-.015a.38.38 0 0 0-.08-.026c-.023-.004-.044-.004-.07-.005-.026 0-.053 0-.08.006-.025.004-.046.014-.07.023-.016.007-.034.008-.051.017l-13.38 7.726c-.009.004-.011.011-.019.016l-.039.03a.358.358 0 0 0-.039.04c-.014.014-.023.027-.034.042-.002.007-.01.01-.014.017-.003.007-.003.014-.007.021a.304.304 0 0 0-.02.049.29.29 0 0 0-.014.053c-.003.018-.006.033-.007.05 0 .009-.004.016-.004.024V-.114c0 .017.007.032.01.048.004.028.006.054.015.08.008.024.02.045.034.067a.306.306 0 0 0 .102.115c.014.01.021.024.036.032l17.43 10.063v7.06c0 .02.008.038.012.058.005.026.007.05.015.075.01.025.024.045.036.068.014.021.024.042.042.06a.34.34 0 0 0 .059.05c.02.014.038.03.06.04.024.012.05.016.075.024.018.005.036.015.056.017l31.583 3.222a.393.393 0 0 0 .188-.028c.017-.007.031-.018.047-.028.025-.015.053-.03.075-.051.015-.015.026-.033.04-.05.016-.021.034-.043.045-.069.01-.02.014-.043.02-.066.006-.02.015-.039.017-.06.002-.007-.002-.013-.001-.02 0-.007.004-.013.004-.02V7.833c0-.019-.01-.036-.011-.055-.003-.02 0-.04-.006-.06zM-.473 1.308c.058-.033.1-.08.131-.131.004-.006.011-.008.014-.013.008-.015.008-.03.014-.044a.34.34 0 0 0 .027-.08c.005-.024.005-.048.005-.073 0-.025 0-.049-.005-.073a.33.33 0 0 0-.027-.08C-.32.8-.32.784-.328.77-.332.763-.34.76-.343.753-.357.73-.376.713-.395.693A.34.34 0 0 0-.455.64C-.462.636-.465.63-.472.625l-23.344-13.477 12.59-7.27 23.74 13.707h.002a.396.396 0 0 0 .392 0h.001l5.88-3.396 5.264 17.19-29.776-3.038Zm-6.111 3.739L24.21 8.19v11.945l-30.795-3.143ZM-24.21-.343v-11.825L-1.46.967l-5.716 3.301c-.011.007-.017.017-.028.024-.011.008-.023.015-.034.026a.303.303 0 0 0-.07.083c-.01.012-.016.024-.024.037a.569.569 0 0 0-.032.104c0 .01-.008.018-.008.028 0 .006.003.013.002.02 0 .007-.004.013-.004.02v4.768z',
            bin:                'M-15.194 20.469c2.82-.076 4.565 2.832 4.158 5.134-.18 1.043-1.12 2.15-3.205 2.143-1.425-.032-2.945-2.003-3.16-3.411-.234-1.542.345-3.729 2.207-3.866zm-.714-1.514c2.584-.81 5.677-.224 7.298 3.131 1.226 3.538-1.004 6.228-3.04 6.536m-7.067-4.584c-.274-2.71 1.132-4.866 3.103-5.143 5.38-.345 7.137 6.318 5.424 8.511-1.53 1.735-2.776 1.673-3.913 1.654-2.522-.004-4.396-2.804-4.614-5.022zm9.332 3.295 8.372 4.315c1.433.815 2.76.707 3.864.193l12.687-6.762c.89-.47 1.71-1.602 1.996-3.542l4.894-34.453M1.753-2.196l-.415 34.468m-21.477-45.51 4.29 32.121M-.072-31.484c-.85-1.054-1.99-.957-2.839-.053l-1.288-.5-19.933 11.22c-1.205.747-.821 2.215.269 2.291-.027.463-.1 1.808-.1 1.808l2.304 1.166.015 1.571L-.966-2.835c1.593.744 3.15.862 4.652.052l18.872-10.171c.593-.412 1.031-1.096 1.104-2.418 1.023-.771 1.408-1.873 1.124-3.154m-43.166-1.042.158 1.012 16.85 9.144c.973.557 3.205.788 4.816.2l17.103-9.221c.487-.313.185-2.146.185-2.146M2.26-31.59l-20.363 11.36c-.347.263-.395.578.124.868l16.754 8.935c1.731.81 3.75.534 5.46-.248l15.39-8.19c1.18-.627 1.697-2.217.143-3.336zm-.956.662-1.147-.649-22.231 12.215c-.763.582-.393.975 0 1.365L-.852-6.704c1.448.561 2.932.627 4.343.124L24.085-17.45c.557-.546 1.007-1.265.311-1.951l-3.705-1.72'
        }

        const arrowGroup = layer.append('g').classed('arrow-group', true)
        // Recovery arrows
        arrowGroup.append('path').classed('iso-illustration', true)
            .attr('d', icons.arrowUpRight)
            .attr('transform', 'translate(1780, 950) scale(2.5)')
        arrowGroup.append('path').classed('iso-illustration', true)
            .attr('d', icons.arrowUpLeft)
            .attr('transform', 'translate(1780, 500) scale(2.5)')
        arrowGroup.append('path').classed('iso-illustration', true)
            .attr('d', icons.arrowUpLeft)
            .attr('transform', 'translate(990, 55) scale(2.5)')
        arrowGroup.append('path').classed('iso-illustration', true)
            .attr('d', icons.arrowDownLeft)
            .attr('transform', 'translate(470, 55) scale(2.5)')

        // Bins
        const binGroup = layer.append('g').classed('bin-group', true)
        binGroup.append('path').classed('iso-illustration line', true)
            .attr('d', icons.bin)
            .attr('transform', 'translate(330, 105) scale(2.5)')
        binGroup.append('path').classed('iso-illustration line', true)
            .attr('d', icons.bin)
            .attr('transform', 'translate(225, 160) scale(2.5)')
        binGroup.append('path').classed('iso-illustration line', true)
            .attr('d', icons.bin)
            .attr('transform', 'translate(120, 215) scale(2.5)')

        // Contamination rate
        const contaminationLabel = layer.append('g').attr('transform', 'translate(50, 700)')
        contaminationLabel.append('text')
            .attr('id', 'system-contamination-pct')
            .classed('title system-contamination', true)
            .html(`${helpers.numberFormatters.formatPct1dec(landfillVolume/totalCollected)}`)
        contaminationLabel.append('text')
            .classed('sub-title system-contamination', true)
            .attr('y', 50)
            .html('contamination')

        // Total recovery
        const recoveryVolumeLabel = layer.append('g').attr('transform', 'translate(1850, 200)')
        recoveryVolumeLabel.append('text')
            .attr('id', 'system-recovery-volume')
            .classed('title system-recovery', true)
            .html(`${helpers.numberFormatters.formatComma(totalCollected - landfillVolume)}`)
        recoveryVolumeLabel.append('text')
            .classed('sub-title system-recovery', true)
            .attr('y', 70)
            .html('tonnes recovered')
        recoveryVolumeLabel.append('text')
            .classed('monthly-title system-recovery', true)
            .attr('y', 120)
            .html(`an average of <tspan id = "system-recovery-monthly-volume">${helpers.numberFormatters.formatComma((totalCollected - landfillVolume)/ vis.flow.state.noMonths)}</tspan> tonnes`)
            .style('opacity', vis.flow.state.noMonths === 1 ? 0 : null)
        recoveryVolumeLabel.append('text')
            .classed('monthly-title system-recovery', true)
            .attr('y', 150)
            .html(`recovered per month`)
            .style('opacity', vis.flow.state.noMonths === 1 ? 0 : null)

    }; // end renderIsometricIllustrations()


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
            'landfill':                 helpers.getCSSVarHex('xDarkCard'),   
            'paper-and-cardboard':      helpers.getCSSVarHex('xDarkBlueCyan'),      
            'glass':                    helpers.getCSSVarHex('tertiaryPurple'), 
            'plastics':                 helpers.getCSSVarHex('xDarkYellow'), 
            'metals':                   helpers.getCSSVarHex('tertiaryBlue'),
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
                .node-group.source .node-group,
                .node-group.target .node-group
            `)
            .style('opacity', 0)

        // No pointer events
        vis.flow.methods.anim.blockEvents(null)
        d3.select('.stepper-nav').style('pointer-events', 'none')
        setTimeout(() => {
            d3.select('.stepper-nav').style('pointer-events', null)
                .transition().duration(250)
                .style('opacity', 1)
        }, duration * 2);
        // Intro animation settings
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

            vis.flow.state.noMonths= fromDateIndex - toDateIndex + 1,
                monthLabel = `${vis.flow.state.noMonths} month`

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
        d3.select('#system-recovery-monthly-volume')
            .transition().duration(duration)
            .tween('text', function(d){
                const currentValue = +this.textContent.replace(/\$|,/g, '')
                let i = d3.interpolate(currentValue, (totalCollected - landfillVolume)/ vis.flow.state.noMonths);
                return function(t){  
                    d3.select(this).text(`${helpers.numberFormatters.formatComma(i(t))}`)  
                };
            });
        d3.selectAll('.system-recovery.monthly-title')
            .transition().duration(duration)
            .style('opacity', vis.flow.state.noMonths === 1 ? 0 : null)

    }; // end updateVis()


    ///////////////////////////////////////////////
    /// ELEMENT ANIMATION / TRANSITION METHODS  ///
    ///////////////////////////////////////////////

    // Block all interaction during intro animation/transition
    vis.flow.methods.anim.blockEvents = function(duration){
        d3.selectAll(`#${settings.svgID} *` ).style('pointer-events', 'none') 
        if(duration){
            setTimeout(() => { 
                d3.selectAll(`#${settings.svgID} *`).style('pointer-events', null)
            }, duration)
        }
    }; // end blockEvents()

    vis.flow.methods.anim.animatePath = (pathID, forward = true, duration = settings.animation.updateDuration, delay = 0, ease = d3.easeCubicIn) => {
        const pathLength = document.getElementById(pathID).getTotalLength()
        d3.select(`#${pathID}`)
            .style('opacity', null)
            .style('stroke-dasharray',  `${pathLength} ${pathLength}`)
            .style('stroke-dashoffset',  forward ? `${pathLength}px` :'0px')
            .transition().duration(duration).delay(delay).ease(ease)
            .style('stroke-dashoffset', forward ?  '0px' : `${pathLength}px` )

        d3.select(`#${pathID}`).style('stroke-dashoffset')
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
            setTimeout( () => {
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
            }, duration)
        }
    }; // end setVerticalNodeAxis()

    vis.flow.methods.anim.setAnnotation = function(step = vis.flow.state.step, duration){
        // Control the position the Collection, Destination and Recycling labels
        switch(step){
            case 'step-1': // Horizontal node intro scene
                setTimeout( () => {
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

                }, duration)
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
                vis.flow.methods.anim.blockEvents(settings.animation.updateDuration * 2)         // No events
                d3.selectAll(` 
                        .link.collection_destination, 
                        .link.destination_collection, 
                        .link.destination_landfill, 
                        .landfill-arrow,
                        .annotation-linkPaths-group, 
                        .linkLabel, 
                        .title-label-group.recycling,
                        .illustration-isometric-layer,
                        .node-group
                    `)
                    .style('pointer-events', 'none')
                break

            case 'step-2': // Vertical node 'default' view for Collection and destination
                vis.flow.methods.anim.blockEvents(settings.animation.updateDuration * 2)        
                setTimeout(() => {
                    d3.selectAll('.link.destination_collection, .title-label-group.recycling')
                        .style('pointer-events', 'none')
                    d3.selectAll('.link.collection_destination, .link.destination_landfill')
                        .style('pointer-events', 'auto')
                        .style('opacity', null)                    
                }, settings.animation.updateDuration * 2 + 10);
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
            setTimeout( () => {
                document.querySelectorAll('.link.collection_destination').forEach((node, i) => {
                    vis.flow.methods.anim.animatePath(node.id, true, offsetDuration, i * animOffset)
                })
            }, duration)
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
            d3.select('.title-label.destination').html('Recovered materials')
        // b. Isometric to 2D
        } else {
            const nodePosY = vis.flow.state.circularFlow ? settings.dims.height - settings.dims.margin.top/4 : settings.dims.margin.top 
            d3.selectAll('.layer').classed('isometric', false)
            // Hide the illustrations
            d3.select('.illustration-isometric-layer').transition().duration(duration)
                .style('opacity', 0)
            d3.select('.title-label.destination').html('Destination')
        }
        // c. Update state
        vis.flow.state.isometric = !vis.flow.state.isometric 
    }; // end showIsometric()


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
        vis.flow.state.noMonths = dateFromIndex - dateToIndex + 1
        d3.select('#monthsLabel').html(`${vis.flow.state.noMonths } month`)
    }; // end setInterface()

    vis.flow.methods.addNav = () => {
        // Setup stepper        
        function moveStepper(el){
            d3.selectAll('.stepper-nav li').classed('step-current', false)	
            d3.select(el).classed('step-current', true).attr('aria-selected', true)
        }
        // Add stepper events 
        d3.selectAll('.step-item').on( 'click', function(){
            // Transition stepper and record state
            d3.selectAll('.stepper-nav li').classed('step-current', false).attr('aria-selected', false)	
            d3.select(this).classed('step-current', true).attr('aria-selected', true)
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



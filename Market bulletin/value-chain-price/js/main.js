////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////                                                        //// 
////  SV MARKET BULLETIN - VALUE CHAIN PRICE DIAGRAM        //// 
////  ----------------------------------------------------  ////
////  Value chain node-link diagram for each material with  //// 
////  price labels for each sub-material                    ////
////                                                        ////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


////////////////////////////////////
//// SETTINGS AND DATA OBJECTS  //// 
////////////////////////////////////

    const settings  = {
        queryParameters:       {},        // Used to store URL query string items
        state: {                            // Used to store material and data state
            material:   null,                           
            date:       null                        
        },
        svgID:          'supply-chain-vis',
        tableName:      'data_commodityValues',
        dims: {
            width:      1080,
            height:     720,
        },
        geometry: {
            nodeRadius:         40,
            linkWidth:          30,
            linkCurveYoffset:   120,
        },
        materialSubtypes: {},           // Ordered lists of commodity prices names per material
    }

    // Positioning of nodes and links
    settings.geometry.chainY = settings.dims.height * 0.5 
    settings.geometry.chain = {
        'Paper and paperboard': {
            'Collection and sorting': {
                position:  {x: settings.dims.width * 0.125,   dy: settings.dims.height * 0.0 },
                from:   null,
                label:  'below'
            },    
            'Reprocessing': {
                position:  {x: settings.dims.width * 0.5,   dy: settings.dims.height * 0.0},
                from:   'Collection and sorting',
                label:  'below'
            },
            'Manufacturing': {
                position:  {x: settings.dims.width * 0.875,   dy: settings.dims.height * 0.0 },
                from:   'Reprocessing',
                label:  'below'
            } 
        },
        'Plastic packaging': {
            'Collection and sorting': {
                position:  {x: settings.dims.width * 0.125,   dy: settings.dims.height * 0.0 },
                from:   null,
                label:  'below'
            },    
            'Reprocessing': {
                position:  {x: settings.dims.width * 0.5,   dy: settings.dims.height * 0.0 },
                from:   'Collection and sorting',
                label:  'below'
            },
            'Manufacturing': {
                position:  {x: settings.dims.width * 0.875,   dy: settings.dims.height * 0.0 },
                from:   'Reprocessing',
                label:  'below'
            } 
        },
        'Metal packaging':  {
            'Collection and sorting': {
                position:  {x: settings.dims.width * 0.125,   dy: settings.dims.height * 0.0 },
                from:   null,
                label:  'below'
            },    
            'Reprocessing': {
                position:  {x: settings.dims.width * 0.5,   dy: settings.dims.height * 0.0 },
                from:   'Collection and sorting',
                label:  'below'
            },
            'Manufacturing': {
                position:  {x: settings.dims.width * 0.875,   dy: settings.dims.height * 0.0 },
                from:   'Reprocessing',
                label:  'below'
            } 
        },
        'Glass packaging': {
            'Collection': {
                position:  {x: settings.dims.width * 0.125,   dy: settings.dims.height * 0.0 },
                from:   null,
                label:  'below'
            },    
            'Beneficiation': {
                position:  {x: settings.dims.width * 0.5,   dy: settings.dims.height * 0.0 },
                from:   'Collection',
                label:  'below'
            },
            'Manufacturing': {
                position:  {x: settings.dims.width * 0.875,   dy:  settings.dims.height * 0.095 },
                from:   'Beneficiation',
                label:  'below'
            }, 
            'Road base': {
                position:  {x: settings.dims.width * 0.875,   dy: - settings.dims.height * 0.095 },
                from:   'Beneficiation',
                label:  'above'
            } 
        }
    }

    // Positioning and labellin oof individual price labels
    settings.geometry.price = {
        'Paper and paperboard': {
            'MRF output':{
                label: 'Reprocessed fibre',
                labelPos: {
                    x: settings.dims.width * 0.45,    
                    y: settings.dims.height * 0.235 
                },
                subMaterials: {
                    'Fibre – Mixed paper and paperboard': {
                        label: 'Mixed paper and paperboard',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.13,
                        y: settings.dims.height * 0.275
                     },
                    'Fibre – Old corrugated cardboard': {
                        label: 'Old corrugated cardboard',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.12,
                        y: settings.dims.height * 0.15
                     }
                }
            },
            'Virgin': {
                label: 'Virgin fibre',
                labelPos: {
                    x: settings.dims.width * 0.775,    
                    y: settings.dims.height * 0.8 
                },
                subMaterials: {
                    'Fibre – Bleached softwood kraft (BSK) pulp': {
                        label: 'Bleached softwood kraft (BSK) pulp',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.535,
                        y: settings.dims.height * 0.675
                     },
                    'Fibre – Bleached hardwood kraft (BHK) pulp': { 
                        label: 'Bleached hardwood kraft (BHK) pulp',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.525,
                        y: settings.dims.height * 0.805
                    }
                } 
            }
        },
        'Plastic packaging': {
            'MRF output':{
                label: 'Reprocessed plastic resin',
                labelPos: {
                    x: settings.dims.width * 0.55,    
                    y: settings.dims.height * 0.2
                },
                subMaterials: {
                    'Plastic – HDPE (2) - Coloured': { 
                        label: 'HDPE (2) - Coloured',
                        labelXOffset: settings.dims.width * -0.0375,
                        x: settings.dims.width * 0.09,
                        y: settings.dims.height * 0.125
                    },
                    'Plastic – HDPE (2) - Clear': { 
                        label: 'HDPE (2) - Clear',
                        labelXOffset: settings.dims.width * -0.0375,
                        x: settings.dims.width * 0.1,
                        y: settings.dims.height * 0.2
                    },
                    'Plastic – PET (1)': {
                        label: 'PET (1)',
                        labelXOffset: settings.dims.width * -0.0375,
                        x: settings.dims.width * 0.11,
                        y: settings.dims.height * 0.275
                    },
                    'Plastic – Mixed (1–7)': { 
                        label: 'Mixed (1–7)',
                        labelXOffset: settings.dims.width * 0.0375,
                        x: settings.dims.width * 0.145,
                        y: settings.dims.height * 0.125
                    },
                    'Plastic – Mixed (3–7)': { 
                        label: 'Mixed (3–7)',
                        labelXOffset: settings.dims.width * 0.0375,
                        x: settings.dims.width * 0.155,
                        y: settings.dims.height * 0.2
                    }
                }
            },
            'Virgin': {
                label: 'Virgin plastic resin',
                labelPos: {
                    x: settings.dims.width * 0.425,    
                    y: settings.dims.height * 0.8 
                },
                subMaterials: {
                    'Plastic – PET (1) virgin resin':{
                        label: 'PET (1)',
                        labelXOffset: settings.dims.width * -0.0375,
                        x: settings.dims.width * 0.7,
                        y: settings.dims.height * 0.825
                    },
                    'Plastic – HDPE (2) virgin resin': { 
                        label: 'HDPE (2)',
                        labelXOffset: settings.dims.width *  -0.0375,
                        x: settings.dims.width * 0.71,
                        y: settings.dims.height * 0.75
                    },
                    'Plastic – PVC (3) virgin resin': { 
                        label: 'PVC (3)',
                        labelXOffset: settings.dims.width * -0.0375,
                        x: settings.dims.width * 0.72,
                        y: settings.dims.height * 0.675
                    },
                    'Plastic – LDPE (4) virgin resin': { 
                        label: 'LDPE (4)',
                        labelXOffset: settings.dims.width * 0.0375,
                        x: settings.dims.width * 0.73,
                        y: settings.dims.height * 0.825
                    },
                    'Plastic – PP (5) virgin resin': { 
                        label: 'PP (5)',
                        labelXOffset: settings.dims.width * 0.0375,
                        x: settings.dims.width * 0.74,
                        y: settings.dims.height * 0.75
                    },
                    'Plastic – PS (6) virgin resin': { 
                        label: 'PP (6)',
                        labelXOffset: settings.dims.width * 0.0375,
                        x: settings.dims.width * 0.75,
                        y: settings.dims.height * 0.675
                    }
                }
            },
        },
        'Metal packaging':  {
            'MRF output':{
                label: 'Reprocessed metals',
                labelPos: {
                    x: settings.dims.width * 0.275,    
                    y: settings.dims.height * 0.25 
                },
                subMaterials: {
                    'Steel': {
                        label: 'Steel',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.525,
                        y: settings.dims.height * 0.125
                    },
                    'Aluminium': { 
                        label: 'Aluminium',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.54,
                        y: settings.dims.height * 0.2
                    },
                }
            },
            'Virgin': {
                label: 'Exchange traded',
                labelPos: {
                    x: settings.dims.width * 0.3,    
                    y: settings.dims.height * 0.8 
                },
                subMaterials: {
                    'Steel (LME steel scrap)':{
                        label: 'Steel (LME steel scrap)',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.525,
                        y: settings.dims.height * 0.825
                    },
                    'Aluminium (LME aluminium alloy)': { 
                        label: 'Aluminium (LME aluminium alloy)',
                        labelXOffset: settings.dims.width *  0,
                        x: settings.dims.width * 0.54,
                        y: settings.dims.height * 0.7
                    }
                }
            }
        },
        'Glass packaging': {
            'MRF output':{
                label: 'Recovered glass',
                labelPos: {
                    x: settings.dims.width * 0.5,    
                    y: settings.dims.height * 0.15 
                },
                subMaterials: {
                    'Glass – Mixed': {
                        label: 'Mixed glass',
                        labelXOffset: settings.dims.width * 0,
                        x: settings.dims.width * 0.125,
                        y: settings.dims.height * 0.225
                    },
                }
            },
            'Virgin': {
                label: 'Virgin glass',
                labelPos: {
                    x: settings.dims.width * 0.75,    
                    y: settings.dims.height * 0.8 
                },
                subMaterials: {
                    'Glass – Virgin materials':{
                        label: 'Virgin glass',
                        labelXOffset: settings.dims.width * 0,
                        leaderStartYOffset: settings.dims.height * 0.15,
                        x: settings.dims.width * 0.875 ,
                        y: settings.dims.height * 0.825,
                        
                    }
                }
            }
        }
    }

    // Data object
    const data = {
        byMaterial:         {},
        tables:             {},
        schema: {
            lists: {
                date:           {},
                month:          {}
            }
        }
    }


//////////////////////////////
//// VISUALISATION BUILD  //// 
//////////////////////////////

    buildFromGSheetData(settings)      //  Load data and call to build sequence


    function buildFromGSheetData(config) {
        // Data table links for each table used from same Google Sheet
        const gsTableLinks =  {
            data_commodityValues:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYe9XdZL2TKia_B1Ncw8eKuwNTiTFhzNST0PWuCNqIUEFBbOlqCpW3ri5odmhng2vpXa5lL3PTHhzD/pub?gid=1635331988&single=true&output=tsv'
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
                        await applyQuerySettings(config)            // a.  Update (default) settings that might be set from query string
                        await parseData(config)        // b.        
                        await setupInterface(config)   // c.        
                        await buildVis(config)                      // d. Build vis
                    }
                }
            })
        }   

        // Table data parsing function
        const parseTable = async (tableName, tableData) => {
            data.tables[tableName] = tableData.map(row => {
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
    }; // end buildFromGSheetData()

    // a. Update settings from query string
    async function applyQuerySettings(){
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('material')) { 
            settings.state.material = settings.queryParameters.get('material')  
        }
        if (settings.queryParameters.has('date')) { 
            settings.state.date = settings.queryParameters.get('date')  
        }
    }; // end applyQuerySettings()

    // b. Parse/shape data for rendering
    async function parseData(settings){
        //  Reshape data: data lists and shape by material
        const priceData = data.tables[settings.tableName]
            // Extract Date lists
            data.schema.lists.date = [...new Set(priceData.map(d => d.date))].sort((a, b) => b - a)      // Take unique only (for flows data)
            data.schema.lists.month = data.schema.lists.date.map(d => helpers.timeFormat.toMthYear(d) )
            // Extract materials list (sorted alphabetically)
            data.schema.lists.materials = [...new Set(  
                Object.keys(priceData[0])
                        .filter(d => d !== 'date') 
                        .map(d => d.slice(d.indexOf('?') + 1) ) 
                        .map(d => d.slice(0, d.indexOf('|') ) ) 
            )].sort()

        // Shape data grouped by materials
        data.schema.lists.materials.forEach( material => {
            data.byMaterial[material] = {}

            data.byMaterial[material] = priceData.map(dataObj => { 
                const obj = {}
                Object.entries(dataObj).forEach( ([key, value]) => {
                    const materialType = key === 'date' ? key : key.slice(0, key.indexOf('?')),
                        materialName =  key.slice(key.indexOf('?') +1, key.indexOf('|') )
                        valueChain =  key.slice(key.indexOf('|') +1 )
                    
                    if(typeof obj[valueChain] === 'undefined'){         // Add a property or valueChain
                        obj[valueChain] = {}
                    }
                    if(material === materialName){
                        obj[valueChain][materialType] = value          
                    } else if(materialType === 'date'){
                        obj.date = value          
                    }
                })
                return obj
            })
        })
    }; // end parseData()

    // c. Setup the dropdown interface
    async function setupInterface(settings){
        const dateSelector = d3.select('#date-selector').classed('vis-selector', true),
                materialSelector = d3.select('#material-selector').classed('vis-selector', true)
        
        data.schema.lists.month.forEach(d => { dateSelector.append('option').attr('value', d).html(d) })
        data.schema.lists.materials.forEach( d => { materialSelector.append('option').attr('value', d).html(d) })

        document.getElementById('date-selector').value = settings.state.date = settings.state.date ? settings.state.date : data.schema.lists.month[0]
        document.getElementById('material-selector').value = settings.state.material = settings.state.material ? settings.state.material : data.schema.lists.materials[0]

        d3.selectAll('.vis-selector').on('change',  rebuild)

        function rebuild(){
            settings.state.date = document.getElementById('date-selector').value
            settings.state.material = document.getElementById('material-selector').value
            const duration = 500

            d3.select(`#${settings.svgID}`)
                .transition().duration(duration * 0.5)
                .style('opacity', 0)

            setTimeout(() => {
                d3.selectAll(`#${settings.svgID} *`).remove()
                buildVis(settings)
                d3.select(`#${settings.svgID}`)
                    .transition().duration(duration * 0.5)
                    .style('opacity', null)
            }, duration * 0.5);

        }
    }; // end setupInterface()

    // d. Build the diagram
    async function buildVis(settings){
        // 1. SETUP SVG AND LAYERS
        const vis = d3.select(`#${settings.svgID}`)
            .attr('viewBox', `0 0 ${settings.dims.width} ${settings.dims.height}`)

        const pricesGroup = vis.append('g').classed('prices-group', true),
            linkGroup = vis.append('g').classed('links-group', true),
            nodesGroup = vis.append('g').classed('nodes-group', true),
            annotationGroup = vis.append('g').classed('annotation-group', true)

        // Link shape generator
        const linkHorizontal = d3.linkHorizontal()
        const linkVertical = d3.linkVertical()

        // 2. RENDER SUPPLY CHAIN: Add nodes, label and paths
        const geometryData = settings.geometry.chain[settings.state.material]

        Object.entries(geometryData).forEach(([name, obj])=> {
            nodesGroup.append('circle').attr('id',`${helpers.slugify(name)}-node`)
                .classed('node', true)
                .attr('cx',  + obj.position.x)
                .attr('cy', settings.geometry.chainY + obj.position.dy)
                .attr('r', settings.geometry.nodeRadius)
                .attr('stroke-width', settings.geometry.nodeRadius * 0.25)

            nodesGroup.append('text')
                .classed('node-label', true)
                .attr('id',`${helpers.slugify(name)}-label`)
                .attr('x', obj.position.x)
                .attr('y', (settings.geometry.chainY + obj.position.dy) + (obj.label === 'below' ? 1 : -1) * (settings.geometry.nodeRadius + 22.5))
                .attr('dy', 0)
                .text(name)
                .call(helpers.wrap, settings.geometry.nodeRadius * 4, 1)

            if(obj.from){
                const points = {
                    source: [geometryData[obj.from].position.x, settings.geometry.chainY ],
                    target: [obj.position.x, settings.geometry.chainY  + obj.position.dy]
                }
                linkGroup.append('path')
                    .classed('link', true)
                    .attr('d', linkHorizontal(points))
                    .style('stroke-width', settings.geometry.linkWidth)
                    .style('fill', 'none')
            }
        })

        // 3. ADD PRICES
        const pricesData = data.byMaterial[settings.state.material].filter(d => helpers.timeFormat.toMthYear(d.date) === settings.state.date)[0]
        // a. Virgin sub-material prices on lower side
        Object.entries(pricesData.Virgin).forEach( ([subMaterial, value], i) => {
            // Get data object and setup layers
            const obj = settings.geometry.price[settings.state.material]['Virgin'].subMaterials[subMaterial]
            const group = pricesGroup.append('g')
                    .classed('virgin-sub-material prices-group virgin', true)
                    .attr('transform', `translate(${obj.x}, ${obj.y})`)
            const textGroup = group.append('g')

            // Add price and sub-material label
            textGroup.append('text')
                .classed(`price-label-value virgin ${helpers.slugify(subMaterial)}`, true)
                .attr('x', obj.labelXOffset + 5 )
                .attr('y', 0)
                .text(helpers.numberFormatters.formatCostInteger(value))

            textGroup.append('text')
                .classed(`price-label virgin ${helpers.slugify(subMaterial)}`, true)
                .text(obj.label)
                .attr('x', obj.labelXOffset + 5)
                .attr('dy', 0)
                .attr('y', 22)
                .call(helpers.wrap, settings.geometry.nodeRadius * 3, 1.1)

            // Add leader line using text group bounding box to extend leader line
            const linkPoints = points = {
                    source: [0, settings.geometry.chainY - obj.y + (obj.leaderStartYOffset ? obj.leaderStartYOffset  : 0)],
                    target: [obj.labelXOffset, settings.geometry.chainY - obj.y + settings.geometry.linkCurveYoffset ]
                },


                vLength = textGroup.node().getBBox().height - (settings.geometry.chainY - obj.y + settings.geometry.linkCurveYoffset),
                leaderPath = `${linkVertical(points)} v${vLength}`

            group.append('path')
                .classed(`price-label-leader virgin`, true)
                .attr('d', leaderPath )
        })

        // b. Reprocessed sub-material prices on upper side
        Object.entries(pricesData['MRF output']).forEach(([subMaterial, value], i) => {
            // Get data object and setup layers
            const obj = settings.geometry.price[settings.state.material]['MRF output'].subMaterials[subMaterial]

            const group = pricesGroup.append('g')
                    .classed('mrf-material-group  prices-group mrf', true)
                    .attr('transform', `translate(${obj.x}, ${obj.y})`)
            const textGroup = group.append('g')

            // Add price and sub-material label
            textGroup.append('text')
                .classed(`price-label-value recovered ${helpers.slugify(subMaterial)}`, true)
                .attr('x', obj.labelXOffset + 5)
                .attr('y', 0)
                .text(helpers.numberFormatters.formatCostInteger(value))

            textGroup.append('text')
                .classed(`price-label recovered ${helpers.slugify(subMaterial)}`, true)
                .text(obj.label)
                .attr('x', obj.labelXOffset + 5)
                .attr('dy', 0)
                .attr('y', 22)
                .call(helpers.wrap, settings.geometry.nodeRadius * 3, 1.1)

            // Add leader line using text group bounding box to extend leader line
            const linkPoints = points = {
                    source: [0, settings.geometry.chainY - obj.y - (obj.leaderStartYOffset ? obj.leaderStartYOffset  : 0)],
                    target: [obj.labelXOffset, settings.geometry.chainY - obj.y - settings.geometry.linkCurveYoffset ]
                },
                vLength = (settings.geometry.chainY - obj.y - settings.geometry.linkCurveYoffset),
                leaderPath = `${linkVertical(points)} v${-vLength}`

            group.append('path')
                .classed(`price-label-leader recovered`, true)
                .attr('d', leaderPath )
        })

        // 4. ADD ANNOTATION
        annotationGroup.append('text')
            .classed('type-label recovered', true)
            .attr('x', settings.geometry.price[settings.state.material]['MRF output'].labelPos.x )
            .attr('y', settings.geometry.price[settings.state.material]['MRF output'].labelPos.y )
            .text(settings.geometry.price[settings.state.material]['MRF output'].label)
        
        annotationGroup.append('text')
            .classed('type-label virgin', true)
            .attr('x', settings.geometry.price[settings.state.material]['Virgin'].labelPos.x )
            .attr('y', settings.geometry.price[settings.state.material]['Virgin'].labelPos.y )
            .text(settings.geometry.price[settings.state.material]['Virgin'].label)


    }; // end buildVis()


//////////////////
//// HELPERS  //// 
//////////////////

    const helpers= {
        numberFormatters: {
            formatComma:           	d3.format(",.0f"),
            formatComma1dec:       	d3.format(",.1f"),
            formatComma2dec:       	d3.format(",.2f"),
            formatInteger:         	d3.format(".0f"),   
            formatCostInteger:     	d3.format("$,.0f"),  
            formatCost1dec:        	d3.format("$,.1f"),  
            formatCost2dec:        	d3.format("$,.2f"),  
            formatPct:          	d3.format(".0%"), 
            formatPct1dec:          d3.format(".1%") ,
        },
        numberParsers: {
            parseDateSlash:         d3.timeParse("%d/%m/%Y"),
            parseDate:              d3.timeParse("%B %d, %Y")
        },
        timeFormat:{
            toMonthYear:               d3.timeFormat("%B %Y"),
            toMthYear:                  d3.timeFormat("%b-%Y")
        },
        slugify: function (str) {
            str = str.replace(/^\s+|\s+$/g, '');                        // trim
            str = str.toLowerCase();
            const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;",            // remove accents,8 swap ñ for n, etc
                to   = "aaaaeeeeiiiioooouuuunc------";
            for (let i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes
            return str;
        },
        wrap: function(text, width, lineHeight, centerVertical = false) {
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
        }
    }
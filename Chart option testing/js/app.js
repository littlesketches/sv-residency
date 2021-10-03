///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////
///  -----------------------------------------------------------------------------  ///
///     SV Market Bulletin publishing tool   |  Version 0.1   - March 2021          ///
///  -----------------------------------------------------------------------------  ///
///                                                                                 ///
///  This is prototype tool for building new editions of SV Market Bulleting in     ///
///  the web browser. It has been designed as a  option to bring together written   ///
///  content with data graphics, tables and visuals rendered from linked 'master'   ///
///  data tables.                                                                   ///
///                                                                                 ///
///  The prototype also also the publication to PDF option via CSS @print media     ///
///  queries.                                                                       ///
///                                                                                 ///
///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////
    // 0. SETUP DATA OBJECTS: to store data from the connected data sources (below)  //
    ///////////////////////////////////////////////////////////////////////////////////

    const content = {
            textByEdition:  {},
            data:           {},
            table:          {},
        },
        schema = {
            editions: [],
            tables: [],
            table: {}
        }
        state = {
            editionName:    "November 2020",        // This is the 'display' title for the edition and is used for general labelling
            editionDate:    "01/11/2020",           // This is the data that is parsed and used to filer data in table and charts. Use the first day of the edition month as this will be used to filter data series that are also configured for the 1st of each month
        }


    //////////////////////////////////////////////////////////////////////////////////////////
    // 1. INITIATION FUNCTION TO LOAD SUPPORTING DATA AND CALL THE BUILD REPORT FUNCTION   ///
    //////////////////////////////////////////////////////////////////////////////////////////

    init()
	function init(){
	    Tabletop.init({
	        key: 	'https://docs.google.com/spreadsheets/d/16sQGA0lV-c4lIGe8aJ9mmIeembzwKrY51XwopQHXizM/',
	        callback: async(loadedData) => {	
                console.log(loadedData)
                // a. Parse table data
                schema.data = Object.keys(loadedData).filter(d => d.slice(0,4) === 'data')
                schema.tables = Object.keys(loadedData).filter(d => d.slice(0,5) === 'table')

                schema.data.forEach(name => {
                    content.data[name] = loadedData[name].elements.map(row => {
                        const newObj = {}
                        Object.entries(row).forEach(([key, value]) => {
                            switch(key.toLowerCase()){
                                case 'date':
                                    newObj[key] =  helpers.numberParsers.parseDateSlash(value)
                                    break     
                                case 'year':
                                case 'label':
                                    newObj[key] = value
                                    break 
                                default:
                                    newObj[key] = isNaN(parseFloat(value.replace(/,/g, ''))) ? value : parseFloat(value.replace(/,/g, '')) 
                            }
                        })
                         return newObj
                    })
                })

                schema.tables.forEach(name => {
                    schema.table[name] = loadedData[name].columnNames       // Record column name order for each table
                    content.table[name] = loadedData[name].elements.filter(d => d.edition === state.editionName).map(row => {
                        const newObj = {}
                        Object.entries(row).forEach(([key, value]) => {
                            switch(key.toLowerCase()){
                                case 'date':
                                    newObj[key] =  helpers.numberParsers.parseDateSlash(value)
                                    break     
                                case 'edition':
                                case 'year':
                                case 'label':
                                    newObj[key] = value
                                    break 
                                default:
                                    newObj[key] = isNaN(parseFloat(value.replace(/,/g, ''))) ? value : parseFloat(value.replace(/,/g, '')) 
                            }
                        })
                        return newObj
                    })
                })
                // b. Parse chart data?


                // c. Store edition content data
                loadedData.mbContent.columnNames.forEach(edition => {
                    if(edition !=='id' && edition !== 'class'){
                        schema.editions.push(edition)
                    }
                    if(typeof(content.textByEdition[edition]) === 'undefined'){
                        content.textByEdition[edition] = {}
                    }
                })

                schema.editions.forEach(edition => {
                    loadedData.mbContent.elements.forEach(obj => {
                        content.textByEdition[edition][obj.id] = {
                            html:       obj[edition],
                            class:      obj.class
                        }
                    })
                })

                // d. Build report
                await buildReport(schema.editions[0])
            },
	        simpleSheet: false,
	        wanted: ['mbContent',  'siteContent', 
                'data_commodityValues',             'data_materialFlows',
                'data_mrfOutput_master',            'data_materialsVicExport_master', 
                'data_mrfOutput_All',               'data_materialsVicExport',
                'data_mrfOutput_Paper',             'data_materialsVicExport_Paper',
                'data_mrfOutput_Glass',             'data_materialsVicExport_Glass',
                'data_mrfOutput_Plastic',           'data_materialsVicExport_Plastic',
                'data_mrfOutput_Metal',             'data_materialsVicExport_Metal',
                'table_mrfOutputByYear',            'table_virginMatCommodityValue', 
                'table_vicExportAnnual',            'table_vicExportMonthly', 
                'table_vicExportAnnual_Paper',      'table_vicExportMonthly_Paper',     'table_glassBinService',
                'table_vicExportAnnual_Plastic',    'table_vicExportMonthly_Plastic',   'table_plasticFacilities',
                'table_vicExportAnnual_Metal',      'table_vicExportMonthly_Metal',     'table_plasticFacilities',
            ]   // Specifies which Google sheets to bring in (and in what order)
	    });
	}; // end init()



    //////////////////////////////////////////////////////////////////////////////////////////
    // 2. BUILD HTML REPORT LAYOUT INCL. DATA GRAPHICS : Called from init function)        ///
    //////////////////////////////////////////////////////////////////////////////////////////

    async function buildReport(edition){ 
        // 1. Fill the HTML written content and images with URLs (local and web)
            Object.entries(content.textByEdition[edition]).forEach(([id, obj]) => {
                switch(obj.class){
                    case 'image':
                        // Update data driven tables, charts, diagrams 
                        d3.select('img#'+id).classed(obj.class, true )
                            .attr('src', `img/${edition}/${obj.html}`)
                            .style('opacity', 0)
                            .transition().duration(500)
                                .style('opacity', null) 
                        break
                    default:
                        // Load html content
                        d3.select('#'+id).html(obj.html).classed(obj.class, true )
                            .style('opacity', 0)
                            .transition().duration(500)
                                .style('opacity', null)
                };            
            });

        // 2. Add regular charts and tables 
            addRegularCharts()            
            function addRegularCharts(){

                //-------------------------------------------- LINE CHARTS --------------------------------------//
                    // Each call to the line chart 'method' (1...N) takes three inputs which configures the chart. 
                    // i)  The 'DOM Element ID': this is the ID in the HTMl where the chart is rendered to
                    // ii) The data object containing the chart data (currently sourced from the Google Sheet)
                    // iii) A chart 'settings' object that allows for configuration of the:
                        //  Chart dimensions (which are then 'fitted' into to container in the HTML, so width/height control the aspect ratio)
                        //  Series for inclusion and label positioning (i.e. manually offsets to prevent label overlapping)
                        //  Other configuration for scale/axes types and labels (these are unlikely to need reconfiguration)
                //----------------------------------------------------------------------------------------------//

                // 0. Iniitalise tooltip
                charts.tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("position", "absolute")


                // 0. Filterable MRF Outputs chart
                charts.line.methods.renderMultiGroupLineChart('chart-MRF-destinations',     // 1. DOM ID of the chart 
                    content.data.data_mrfOutput_master,         // 2. Data table for the chart
                    {                                           // 3. Chart settings/configuration object
                        config: {
                            interactive:       true
                        }, 
                        dims: {                                 // a. Dims are used to set the aspect ratio (heigh and width) and margins
                            width:      960,    
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        },
                        group:              'Plastic packaging',                            // b. Materials group as named in the source data header (after the '_') : ['All collected materials, Paper and Paperboard, Glass packaging, Plastic packaging, Metal packaging]
                        series:             ['Local reprocessing',	'Export', 'Landfill'],  // c. Names of the data series in the source data header (before the '_') 
                        labelOffset: [              // d. Enables manual placement (offsetting) of series labels. Each object/row is in the order of the series names above
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0},   
                        ],
                        scales: {   
                            x: {type: 'time',       unit: 'date' },
                            y: {type: 'linear',     unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/10/2019', end:'01/09/2020', offset: -3},
                            y: {label: "tonnes collected", unit: 'tonnes'}
                        }
                    } 
                ) 

                // 1. Add the MRF Outputs chart
                charts.line.methods.renderLineChart('chart-MRF-destinations-all',     // 1. DOM ID of the chart 
                    content.data.data_mrfOutput_All,        // 2. Data table for the chart
                    {                                       // 3. Chart settings/configuration object
                        config: {
                            seriesFilter:       false
                        }, 
                        dims: {                                 // a. Dims are used to set the aspect ratio (heigh and width) and margins
                            width:      960,    
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        }, 
                        series:     ['Local reprocessing',	'Export', 'Landfill'],  // b. Names of the data series in the source data that 
                        labelOffset: [              // c. Enables manual placement (offsetting) of series labels. Each object/row is in the order of the series names above
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0},   
                        ],
                        scales: {   
                            x: {type: 'time',      unit: 'date',    },
                            y: {type: 'linear',     unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: -3},
                            y: {label: "tonnes per month", unit: 'tonnes'}
                        }
                    } 
                ) 

                // 2. Add the MRF Storage chart
                charts.line.methods.renderLineChart('chart-MRF-storage',             // 1. DOM ID of the chart
                    content.data.data_mrfOutput_All, 
                    {                               // 2. DOM ID of the chart
                        config: {
                            seriesFilter:       false
                        }, 
                        // Chart settings object
                        dims: {
                            width:      960,
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        }, 
                        series: ['Change in storage',	'Accumulated storage'],
                        labelOffset: [             
                            {x: 0,  y: 5},   
                            {x: 0,  y: -5}
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "tonnes per month", unit: 'tonnes'}
                        }
                    } 
                ) 

                // 3. Add the Commodity price chart
                charts.line.methods.renderLineChart('chart-vic-commodity-prices', 
                    content.data.data_commodityValues, 
                    {
                        config: {
                            seriesFilter:       false
                        }, 
                        // Chart settings object
                        dims: {
                            width:      960,
                            height:     960,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     150,
                                left:       80,
                            }
                        }, 
                        series: ['Aluminium',	'Fibre – Mixed paper & paperboard', 'Fibre – Old corrugated cardboard', 'Glass – Mixed', 'Plastic – PET (1)', 'Plastic – HDPE (2)', 'Plastic – Mixed (1–7)', 'Plastic – Mixed (3–7)', 'Steel'],
                        labelOffset: [             
                            {x: 0,  y: 0},          // Aluminium
                            {x: 0,  y: 0},          // Fibre – Mixed paper & paperboard
                            {x: 0,  y: 0},          // Fibre – Old corrugated cardboard
                            {x: 0,  y: 0},          // Glass – Mixed
                            {x: 0,  y: 0},          // Plastic – PET (1) 
                            {x: 0,  y: 0},          // Plastic – HDPE (2)
                            {x: 0,  y: 0},          // Plastic – Mixed (1–7)
                            {x: 0,  y: 0},          // Plastic – Mixed (3–7)
                            {x: 0,  y: 0},          // Steel
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'price'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "$ per tonne", unit: 'per tonne'}
                        }
                    } 
                ) 

                // 4. Add the Paper and paperboard MRF Outputs chart
                charts.line.methods.renderLineChart('chart-paper-MRF-outputs',     // 1. DOM ID of the chart 
                    content.data.data_mrfOutput_Paper,        // 2. Data table for the chart
                    {                                       // 3. Chart settings/configuration object
                        config: {
                            seriesFilter:       false
                        }, 
                        dims: {                                 // a. Dims are used to set the aspect ratio (heigh and width) and margins
                            width:      960,    
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        }, 
                        series:     ['Local reprocessing or storage',	'Export', 'Landfill'],  // b. Names of the data series in the source data that 
                        labelOffset: [              // c. Enables manual placement (offsetting) of series labels. Each object/row is in the order of the series names above
                            {x: 0,  y: 0},          // 'Local reprocessing or storage'
                            {x: 0,  y: 0},          // 'Export'
                            {x: 0,  y: 0},          // 'Landfill'
                        ],
                        scales: {   
                            x: {type: 'time',      unit: 'date',    },
                            y: {type: 'linear',     unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: -3},
                            y: {label: "tonnes per month", unit: 'tonnes'}
                        }
                    } 
                ) 

                // 5. Add the Glass MRF Outputs chart
                charts.line.methods.renderLineChart('chart-glass-MRF-outputs',     // 1. DOM ID of the chart 
                    content.data.data_mrfOutput_Glass,     // 2. Data table for the chart
                    {                                      // 3. Chart settings/configuration object
                        config: {
                            seriesFilter:       false
                        }, 
                        dims: {                                 // a. Dims are used to set the aspect ratio (heigh and width) and margins
                            width:      960,    
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        }, 
                        series:     ['Local reprocessing or storage', 'Export', 'Landfill'],  // b. Names of the data series in the source data that 
                        labelOffset: [                          // c. Enables manual placement (offsetting) of series labels. Each object/row is in the order of the series names above
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0},   
                        ],
                        scales: {   
                            x: {type: 'time',      unit: 'date',    },
                            y: {type: 'linear',     unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: -3},
                            y: {label: "tonnes per month", unit: 'tonnes'}
                        }
                    } 
                ) 

                // 6. Add the Plastics MRF Outputs chart
                charts.line.methods.renderLineChart('chart-plastic-MRF-outputs',     // 1. DOM ID of the chart 
                    content.data.data_mrfOutput_Plastic,       // 2. Data table for the chart
                    {                                          // 3. Chart settings/configuration object
                        config: {
                            seriesFilter:       false
                        }, 
                        dims: {                                     // a. Dims are used to set the aspect ratio (heigh and width) and margins
                            width:      960,    
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        }, 
                        series:     ['Local reprocessing or storage', 'Export', 'Landfill'],  // b. Names of the data series in the source data that 
                        labelOffset: [                          // c. Enables manual placement (offsetting) of series labels. Each object/row is in the order of the series names above
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0},   
                        ],
                        scales: {   
                            x: {type: 'time',      unit: 'date',    },
                            y: {type: 'linear',     unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: -3},
                            y: {label: "tonnes per month", unit: 'tonnes'}
                        }
                    } 
                ) 

                // 7. Add the Metals MRF Outputs chart
                charts.line.methods.renderLineChart('chart-metal-MRF-outputs',     // 1. DOM ID of the chart 
                    content.data.data_mrfOutput_Metal,       // 2. Data table for the chart
                    {                                          // 3. Chart settings/configuration object
                        config: {
                            seriesFilter:       false
                        }, 
                        dims: {                                     // a. Dims are used to set the aspect ratio (heigh and width) and margins
                            width:      960,    
                            height:     480,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     50,
                                left:       80,
                            }
                        }, 
                        series:     ['Local reprocessing or storage', 'Export', 'Landfill'],  // b. Names of the data series in the source data that 
                        labelOffset: [                          // c. Enables manual placement (offsetting) of series labels. Each object/row is in the order of the series names above
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0},   
                        ],
                        scales: {   
                            x: {type: 'time',      unit: 'date',    },
                            y: {type: 'linear',     unit: 'number'}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: -3},
                            y: {label: "tonnes per month", unit: 'tonnes'}
                        }
                    } 
                ) 

                ///////////////////////
                //// LAYER CHARTS ////
                ///////////////////////

                // 0. Add filterable
                charts.layer.methods.renderMultiGroupLayerChart('chart-vic-export', 
                    content.data.data_materialsVicExport_master, 
                    {    // Chart settings object
                        config: {
                            interactive:       true
                        }, 
                        dims: {
                            width:      960,
                            height:     540,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     80,
                                left:       80,
                            }
                        }, 
                        group:              'All collected materials',                            // b. Materials group as named in the source data header (after the '_') : ['All collected materials, Paper and Paperboard, Glass packaging, Plastic packaging, Metal packaging]
                        series: ['All other countries', 'China','Indonesia', 'India', 'Malaysia', 'Korea', 'Pakistan', ],
                        labelOffset: [             
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 2}, 
                            {x: 0,  y: -3}, 
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'number    '}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "tonnes exported", unit: 'tonnes'}
                        },
                        options: {
                            addTotalLine: true
                        }
                    }
                ) 

                // 1. Add Vic materials export chart
                charts.layer.methods.renderLayerChart('chart-vic-export-materials', 
                    content.data.data_materialsVicExport, 
                    {    // Chart settings object
                        dims: {
                            width:      960,
                            height:     540,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     80,
                                left:       80,
                            }
                        }, 
                        series: ['All other countries', 'China','Indonesia', 'India', 'Malaysia', 'Korea', 'Pakistan', ],
                        labelOffset: [             
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 2}, 
                            {x: 0,  y: -3}, 
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'number    '}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "tonnes exported", unit: 'tonnes'}
                        },
                        options: {
                            addTotalLine: true
                        }
                    }
                ) 

                // 2. Add Vic Paper and paperboard export chart
                charts.layer.methods.renderLayerChart('chart-paper-export', 
                    content.data.data_materialsVicExport_Paper, 
                    {
                        // Chart settings object
                        dims: {
                            width:      960,
                            height:     540,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     150,
                                left:       80,
                            }
                        }, 
                        series: ['All other countries', 'China', 'Thailand', 'Indonesia', 'Vietnam', 'Malaysia', 'India'],
                        labelOffset: [             
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 2}, 
                            {x: 0,  y: -3}, 
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'number    '}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "tonnes exported", unit: 'tonnes'}
                        },
                        options: {
                            addTotalLine: true
                        }
                    }
                ) 

                // 3. There is no Vic glass export chart

                // 4. Add Vic Plastics export chart
                charts.layer.methods.renderLayerChart('chart-plastic-export', 
                    content.data.data_materialsVicExport_Plastic, 
                    {
                        // Chart settings object
                        dims: {
                            width:      960,
                            height:     540,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     150,
                                left:       80,
                            }
                        }, 
                        series: ['All other countries', 'Malaysia', 'China', 'Indonesia', 'Taiwan', 'Vietnam'],
                        labelOffset: [             
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'number    '}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "tonnes exported", unit: 'tonnes'}
                        },
                        options: {
                            addTotalLine: true
                        }
                    }
                ) 

                // 5. Add Vic Metals export chart
                charts.layer.methods.renderLayerChart('chart-metal-export', 
                    content.data.data_materialsVicExport_Metal, 
                    {
                        // Chart settings object
                        dims: {
                            width:      960,
                            height:     540,
                            margin: { 
                                top:        50,
                                right:      250,
                                bottom:     150,
                                left:       80,
                            }
                        }, 
                        series: ['All other countries', 'India', 'Indonesia', 'Korea', 'Thailand', 'Taiwan'],
                        labelOffset: [             
                            {x: 0,  y: 0},   
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                            {x: 0,  y: 0}, 
                        ],
                        scales: {
                            x: {type: 'time',      unit: 'date'},
                            y: {type: 'linear',    unit: 'number    '}
                        },
                        axis: {
                            x: {label: "", units: "", start:'01/01/2015', end:'01/09/2020', offset: 0},
                            y: {label: "tonnes exported", unit: 'tonnes'}
                        },
                        options: {
                            addTotalLine: true
                        }
                    }
                ) 

            }; // end addCharts()

        // 3. Add data visualisations
            // a. Materials flow vis
            if(document.getElementById('figure-materials-flow')){
                await visualisations.flow.methods.renderFlowVis(content.data.data_materialFlows, 'figure-materials-flow', flowVisSettings)
            }

        // 4. Add regular HTML tables
            addRegularTables()
            function addRegularTables(){
                helpers.buildHTMLTable('table_mrfOutputByYear',      // Table data name (matches GSheet)
                    'table-MRF-outputs' ,                       // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto' ],         // All other columns (i.e. years) are configured with  the last values
                        tableColumnClass: ['left', 'right'],        // All other columns (i.e. years)  are configured with  the last values
                    }
                )
                // i. Tables for commodity values
                helpers.buildHTMLTable('table_virginMatCommodityValue',      // Table data name (matches GSheet)
                    'table-virgin-material-commodity-value',            // ID of table in the HTML output (i.e. where to place the table)
                    {                                                   // Settings object {} to set column widths and classes for aligning column text
                        tableColumnWidth: ['30%', '30%', '40%' ],
                        tableColumnClass: ['left', 'centre', 'left' ],
                    }
                )

                // ii. Tables for all materials export (annual and monthly)
                helpers.buildHTMLTable('table_vicExportAnnual',      // Table data name (matches GSheet)
                    'table-vic-annual-export',                 // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto' ],         // All other columns (i.e. years)  are configured with  the last values
                        tableColumnClass: ['left', 'right'],        // All other columns (i.e. years) are configured with  the last values
                    }
                )
                helpers.buildHTMLTable('table_vicExportMonthly',     // Table data name (matches GSheet)
                    'table-vic-monthly-export',                // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto',  'auto'  ],     
                        tableColumnClass: ['left', 'right', 'right'],    
                    }
                )

                // iii. Tables for Paper and paperboard export (annual and monthly)
                helpers.buildHTMLTable('table_vicExportAnnual_Paper',      // Table data name (matches GSheet)
                    'table-vic-annual-export-paper',                 // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto' ],         // All other columns (i.e. years)  are configured with  the last values
                        tableColumnClass: ['left', 'right'],        // All other columns (i.e. years) are configured with  the last values
                    }
                )
                helpers.buildHTMLTable('table_vicExportMonthly_Paper',     // Table data name (matches GSheet)
                    'table-vic-monthly-export-paper',                // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto',  'auto'  ],     
                        tableColumnClass: ['left', 'right', 'right'],    
                    }
                )

                // iv. Tables for Glass bin services 
                helpers.buildHTMLTable('table_glassBinService',     // Table data name (matches GSheet)
                    'table-glass-bin-service',                // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', '25%', '10%',  '40%'  ],     
                        tableColumnClass: ['left', 'centre', 'centre', 'left'],    
                    }
                )

                // v. Tables for PLastics export (annual and monthly) and new plastics facilities
                helpers.buildHTMLTable('table_vicExportAnnual_Plastic',      // Table data name (matches GSheet)
                    'table-vic-annual-export-plastic',                 // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto' ],         // All other columns (i.e. years)  are configured with  the last values
                        tableColumnClass: ['left', 'right'],        // All other columns (i.e. years) are configured with  the last values
                    }
                )
                helpers.buildHTMLTable('table_vicExportMonthly_Plastic',     // Table data name (matches GSheet)
                    'table-vic-monthly-export-plastic',                // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto',  'auto'  ],     
                        tableColumnClass: ['left', 'right', 'right'],    
                    }
                )
                helpers.buildHTMLTable('table_plasticFacilities',     // Table data name (matches GSheet)
                    'table-plastic-facilities',                // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['20%', '15%', '15%',  '30%', '30%' ],     
                        tableColumnClass: ['left', 'centre', 'centre', 'left', 'left'],    
                    }
                )

                // vi. Tables for Metals export (annual and monthly) and new plastics facilities
                helpers.buildHTMLTable('table_vicExportAnnual_Metal',      // Table data name (matches GSheet)
                    'table-vic-annual-export-metal',                 // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto' ],         // All other columns (i.e. years)  are configured with  the last values
                        tableColumnClass: ['left', 'right'],        // All other columns (i.e. years) are configured with  the last values
                    }
                )
                helpers.buildHTMLTable('table_vicExportMonthly_Metal',     // Table data name (matches GSheet)
                    'table-vic-monthly-export-metal',                // ID of table in the HTML output (i.e. where to place the table)
                    {                                           // Settings object to set column widths and classes for aligning column text
                        tableColumnWidth: ['25%', 'auto',  'auto'  ],     
                        tableColumnClass: ['left', 'right', 'right'],    
                    }
                )
            }; // end addRegularTables

        // X. ADD SPECIAL 



    }; // end buildReport



    //////////////////////////////////////////////////////////////////////////////////////////
    /// X HELPER FUNCTIONS | Formatting and text manipulations helper functions            ///
    //////////////////////////////////////////////////////////////////////////////////////////

    const helpers= {
        numberFormatters: {
            formatComma:           	d3.format(",.0f"),
            formatComma1dec:       	d3.format(",.1f"),
            formatComma2dec:       	d3.format(",.2f"),
            formatInteger:         	d3.format(".0f"),   
            formatCostInteger:     	d3.format("$,.0f"),  
            formatCost1dec:        	d3.format("$,.1f"),  
            formatPct:          	d3.format(".0%"), 
            formatPct1dec:          d3.format(".1%")  
        },
        numberParsers: {
            parseDateSlash: d3.timeParse("%d/%m/%Y")
        },
        camelize: function(str) {
            return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
                if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
                return index === 0 ? match.toLowerCase() : match.toUpperCase();
            });
        }, 
        slugify: function (str) {
            str = str.replace(/^\s+|\s+$/g, ''); // trim
            str = str.toLowerCase();
            // remove accents, swap ñ for n, etc
            var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
            var to   = "aaaaeeeeiiiioooouuuunc------";
            for (var i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes
            return str;
        }, 
        // Helper function to build and render HTML tables to the report
        buildHTMLTable(tableName, id, settings){
                // 1. Get table data, filter out non-display data and set headers (in same order as the GSheet table format), and append HTML table structure
                const tableData = content.table[tableName],
                    headerData = tableData.filter(d => d.type === 'header')[0],
                    headerIDs = schema.table[tableName].filter(d => d !== 'edition' && d !== 'type'  && d.slice(0,7) !== 'rowspan'),
                    headers = schema.table[tableName].filter(d => d !== 'edition' && d !== 'type'  && d.slice(0,7) !== 'rowspan').map( d=> headerData[d]),
                    rowData = tableData.filter(d => d.type !== 'header'),
                    tableContainer = d3.select('#'+id).classed('table', true),
                    tableHeader =   tableContainer.append('thead'),
                    tableBody =   tableContainer.append('tbody'),
                    headerRow = tableHeader.append('tr')

                // 2. Add the table headers
                headers.forEach((header, i) => { 
                    const cellClass = i >= settings.tableColumnWidth.length ? settings.tableColumnClass[settings.tableColumnWidth.length-1] : settings.tableColumnClass[i]
                    headerRow.append('th')
                        .classed(cellClass, true)
                        .attr('colspan', 1)
                        .style('width', i > settings.tableColumnWidth.length ? 'auto' : settings.tableColumnWidth[i])
                        .html(header)
                })
                // Add the table rows
                rowData.forEach(tableDataObj => {
                    const tableRow = tableBody.append('tr')
                    headerIDs.forEach((headerID, i) => {
                        const cellClass = i >= settings.tableColumnWidth.length ? settings.tableColumnClass[settings.tableColumnWidth.length-1] : settings.tableColumnClass[i]
                        if(tableDataObj[headerID] !== ""){
                            const datum = isNaN(tableDataObj[headerID]) ? 
                                tableDataObj[headerID] : 
                                headerID === 'pctChange' ? helpers.numberFormatters.formatComma(tableDataObj[headerID])+' %'
                                : helpers.numberFormatters.formatComma(tableDataObj[headerID])

                            tableRow.append('td')
                                .classed(cellClass+' '+tableDataObj.type, true)
                                .attr('colspan', 1)
                                .attr('rowspan', tableDataObj['rowspan_'+headerID])
                                .style('width', i > settings.tableColumnWidth.length ? 'auto' : settings.tableColumnWidth[i])
                                .html(datum)
                        }
                    })
                })
        } // end buildTable
    }
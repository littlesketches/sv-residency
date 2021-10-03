////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
////                                                        //// 
////  SV MARKET BULLETIN - MATERIALS DASHBOARD  COMPONENTS  //// 
////  ----------------------------------------------------  ////
//// Charts and data elements for updating each separate    //// 
//// component (card) available in the HTML/SVG version     ////
//// of the market bulletin dashboard                       ////
////                                                        ////  
//// This script will be adapted for use in producing       ////
//// individual component layouts in (e.g. single 'cards')  ////
//// for use in various sections and arrangements in the    ////
//// digital version of the market bulletin.                ////
////                                                        ////
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////


//////////////////////////
//// SETTINGS OBJECT  //// 
//////////////////////////

    const settings  = {
        queryParameters:       {},        // Used to store URL query string items
        containerIDs: {
            volumeContainer:        'material-title',
            flowContainer:          'material-flow-container',
            priceContainer:         'material-price-container',
            exportContainer:        'export-market-container'
        },
        materialSubtypes: {},           // Ordered lists of commodity prices names per material
        tableToSection: {
            data_mrfOutput:             'volume',
            data_commodityValues:       'price',
            data_materialsVicExport:    'export'
        },
        sectionToTable: {
            volume:                 'data_mrfOutput',
            price:                  'data_commodityValues', 
            export:                 'data_materialsVicExport'
        }
    }

    const data = {
        loaded:             {},
        byMaterial:         {},
        tables:             {},
        schema: {
            lists: {
                date:           {}
            }
        }
    }

    const state = {
        material:    "Paper and cardboard",    // This is the 'display' title for the edition and is used for general labelling
        date:  {}                               // Date (month) of data for each section
    }

    const charts = {                  // Stores the chart methods for rendering and update
        methods:        {}
    }

/////////////////////////////////////////
//// INIT FUNCTION (CALLED ON LOAD)  //// 
/////////////////////////////////////////

    initVis(settings) 

    // Init function to load data and call generic buildVis function that is setup (and customised where necessary) for each 
    function initVis(config) {
        // 1 Setup and specification of data endpoint tables
        const dataTables =  ['data_mrfOutput', 'data_materialsVicExport', 'data_commodityValues']   // Table names matched to the dataEndpointURls object (held in the data-endpoints.js file)

        // 2. Asynchronous data load (with Promise.all) and D3 (Fetch API) 
        Promise.all(
            dataTables.map(d => d3.tsv(dataEndpointURLs[d]) )
        ).then( rawData => {
            // a. Parse each loaded data table and store in data.table object, using the parseTable helper 
            rawData.forEach((tableData, i) => {parseTable(dataTables[i], tableData) })
            return data.tables
        }).then( async (data) => {
            // 3. Initiate vis build sequence with data now loaded
            await applyQuerySettings(config)        // a. Update (default) settings that might be set from query string
            await parseData(data, config)           // b. Parse and transform data        
            await buildDashboard()                  // c. Build report
            d3.selectAll('.main-container')        // Reveal chart
                .transition().duration(800)
                .style('opacity', null)     
        })

        // Table data parsing function
        const parseTable = async (tableName, tableData) => {
            data.tables[settings.tableToSection[tableName]] = tableData.map(row => {
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

    // a. Update settings from query string
    async function applyQuerySettings(){
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('material')) { 
            state.material = settings.queryParameters.get('material')  
            d3.selectAll('.materials-option').style('display', 'none')
            d3.select('#flow-header').html(`Kerbside collected ${state.material.toLowerCase()} data`)
            d3.select('#export-header').html(`${state.material} export data trends`)
        }
    };

    // b. Parse/shape data for rendering
    async function parseData(loadedData, settings){
        // a. Reshape data: data lists and shape by material
        // Extract Date lists
        Object.keys(loadedData).forEach(tableName => {
            data.schema.lists.date[tableName] = [...new Set(data.tables[tableName].map(d => d.date))]       // Take unique only (for flows data)
        })
        // Extract materials list
        data.schema.lists.materials = [...new Set(Object.keys(data.tables.volume[0]).map(d => d.slice(d.indexOf('_') + 1)).filter(d => d !== 'date' & d !== 'All collected materials') )].sort()
        // Extract dashboard section list
        data.schema.lists.sections = Object.keys(settings.sectionToTable)
        // Set latest available date as default UNLESS a date is specified in the 
        data.schema.lists.sections.forEach(section => {
            state.date[section] = settings.queryParameters.has('date') ? helpers.numberParsers.parseMthYear(settings.queryParameters.get('date')).toString() : data.tables[section][data.tables[section].length - 1].date.toString()
        })

        // Shape data grouped by materials
        data.schema.lists.materials.forEach( material => {
            data.byMaterial[material] = {}
            Object.keys(settings.sectionToTable).forEach(section => {
                switch(section){
                    case 'volume':
                        data.byMaterial[material][section] = data.tables[section].map(dataObj => { 
                            const obj = {}
                            Object.entries(dataObj).forEach( ([key, value]) => {
                                const materialName =  key.slice(key.indexOf('_') +1 ),
                                    stream = key === 'date' ? key : key.slice(0, key.indexOf('_')) 
                                if( (material === materialName && stream !== 'All collected materials') || stream === 'date'){
                                    obj[stream] = value
                                }
                            })
                            return obj
                        })
                        break

                    case 'export':
                        data.byMaterial[material][section] = data.tables[section].map(dataObj => { 
                            const obj = {}
                            Object.entries(dataObj).forEach( ([key, value]) => {
                                const materialName =  key.slice(key.indexOf('_') +1 ),
                                    country = key === 'date' ? key : key.slice(0, key.indexOf('_')) 
                                if( material === materialName){
                                    obj[country] = value
                                } else if(country === 'date'){
                                    obj.date = value          
                                }
                            })
                            return obj
                        })
                        break

                    case 'price':
                        data.byMaterial[material][section] = data.tables[section].map(dataObj => { 
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

                        break



                    default:
                        data.byMaterial[material][section] = data.tables[section]
                }

            })
        })

        // Create dashboard settings dropdowns
        const materialsSelector = d3.select('#materials-selector').on('change', updateDashboard),
            dateSelector = d3.select('#date-selector').on('change', updateDashboard),
            indexOfFirstVirginPrices =     17               // Note: goes back May 2019     
        data.schema.lists.materials.forEach(material => {
            materialsSelector.append('option').classed('materials-option', true)
                .attr('value', material)
                .html(material)
        })

        data.schema.lists.date.volume
            .sort((a, b) => b - a)
            .slice(0, indexOfFirstVirginPrices)
            .forEach(date => {      
                dateSelector.append('option').classed('materials-option', true)
                    .attr('value', date)        // Date timestamp as a string
                    .html(helpers.timeFormat.toMonthYear(date))
            })
        // Set the dropdown to match the settings and passed in query string
        if(document.getElementById('materials-selector')){
            document.getElementById('materials-selector').value = state.material 
        }
        if(document.getElementById('date-selector')){
            document.getElementById('date-selector').value = state.date.volume 
        }    
        // Set a slug material class on the main container for specific layout changes
        d3.select('main.main-container').classed(helpers.slugify(state.material), true)
    };

    // 2. ON PAGE LOAD FUNCTION: GET AND PARSE DATA 
    async function buildDashboard(material = state.material, date){
        d3.selectAll('#material-title, .sub-card').transition().duration(0).style('opacity', 0)
        const defs = d3.select('#defs').append('defs')
        // Patterns
        defs.append('pattern')
            .attr('id', 'diagonalHatch-all')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
            .append('path')
                .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
                .attr('stroke', 'var(--xCharcoal)')
                .attr('stroke-width', 0.25)
                .attr("opacity", 1);

        defs.append('pattern')
            .attr('id', 'diagonalHatch-local-reprocessing')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
            .append('path')
                .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
                .attr('stroke', 'var(--secondaryBottleGreen)')
                .attr('stroke-width', 0.75)
                .attr("opacity", 1);

        defs.append('pattern')
            .attr('id', 'diagonalHatch-export')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
            .append('path')
                .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
                .attr('stroke', 'var(--tertiaryEmeraldLight)')
                .attr('stroke-width', 0.75)
                .attr("opacity", 1);

        defs.append('pattern')
            .attr('id', 'diagonalHatch-landfill')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
            .append('path')
                .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
                .attr('stroke', 'var(--tertiaryCard)')
                .attr('stroke-width', 0.75)
                .attr("opacity", 1);

        await buildMaterialsCard(material)  
        await buildPriceCards(material)   
        await buildExportCard(material)  
        await revealDashboard(material) 

    };


////////////////////////////////////
//// COMPONENT BUILD FUNCTIONS  //// 
////////////////////////////////////

    // Populate materials card in static HTML template
    async function buildMaterialsCard(material = state.material, date = state.date.volume){
        // Get data strings
        const thisMonthString = date,
            thisMonthObject = new Date(date),
            materialData = data.byMaterial[material],
            thisMonthIndex = materialData.volume.map(d => d.date.toString()).indexOf(thisMonthString),
            monthYear = helpers.timeFormat.toMonthYear(thisMonthObject),
            mthYr =  helpers.timeFormat.toMthYr(thisMonthObject)

        const thisMonthData = materialData.volume[thisMonthIndex],
            thisMonthlocalReprocessing = thisMonthData['Local reprocessing'],
            thisMonthExport = thisMonthData['Export'],
            thisMonthLandfill= thisMonthData['Landfill'],
            thisMonthTotalVolume = d3.sum(Object.entries(thisMonthData).filter(d=> d[0] !== 'date').map(d => d[1])),

            lastMonthData = materialData.volume[thisMonthIndex - 1],
            lastMonthlocalReprocessing = lastMonthData['Local reprocessing'],
            lastMonthExport = lastMonthData['Export'],
            lastMonthLandfill= lastMonthData['Landfill'],
            lastMonthTotalVolume = d3.sum(Object.entries(lastMonthData).filter(d=> d[0] !== 'date').map(d => d[1]))

        const vsLastTotalVolume = thisMonthTotalVolume - lastMonthTotalVolume, 
            vsLastTotalPct = thisMonthTotalVolume/lastMonthTotalVolume - 1,

            materialData3mth = materialData.volume.slice(thisMonthIndex - 2, thisMonthIndex + 1),
            materialData1yr = materialData.volume.slice(thisMonthIndex -11, thisMonthIndex + 1),
            materialData3yr = materialData.volume.slice(thisMonthIndex -35, thisMonthIndex + 1),
            materialData5yr = materialData.volume.slice(thisMonthIndex -59, thisMonthIndex + 1),

            // Collection trends: all materials
            totalVolMthAve3mth =  d3.mean(materialData3mth.map(d => d3.sum(Object.entries(d).filter(d=> d[0] !== 'date').map(d => d[1]))) ),
            totalVolMthAve1yr =  d3.mean(materialData1yr.map(d => d3.sum(Object.entries(d).filter(d=> d[0] !== 'date').map(d => d[1]))) ),
            totalVolMthAve3yr =  d3.mean(materialData3yr.map(d => d3.sum(Object.entries(d).filter(d=> d[0] !== 'date').map(d => d[1]))) ),
            totalVolMthAve5yr =  d3.mean(materialData5yr.map(d => d3.sum(Object.entries(d).filter(d=> d[0] !== 'date').map(d => d[1]))) ),

            totalVolVsAve3mth = thisMonthTotalVolume / totalVolMthAve3mth - 1,
            totalVolVsAve1yr = thisMonthTotalVolume / totalVolMthAve1yr - 1,
            totalVolVsAve3yr = thisMonthTotalVolume / totalVolMthAve3yr - 1,
            totalVolVsAve5yr = thisMonthTotalVolume / totalVolMthAve5yr - 1,

                // Collection trends: Local reprocessing
            localReprocessingMthAve3mth = d3.mean(materialData3mth.map(d => d['Local reprocessing'])),
            localReprocessingMthAve1yr =  d3.mean(materialData1yr.map(d => d['Local reprocessing']) ),
            localReprocessingMthAve3yr =  d3.mean(materialData3yr.map(d => d['Local reprocessing']) ),
            localReprocessingMthAve5yr =  d3.mean(materialData5yr.map(d => d['Local reprocessing']) ),

            localReprocessingVsAve3mth = thisMonthlocalReprocessing / localReprocessingMthAve3mth - 1,
            localReprocessingVsAve1yr = thisMonthlocalReprocessing / localReprocessingMthAve1yr - 1,
            localReprocessingVsAve3yr = thisMonthlocalReprocessing / localReprocessingMthAve3yr - 1,
            localReprocessingVsAve5yr = thisMonthlocalReprocessing / localReprocessingMthAve5yr - 1,

                // Collection trends: Export
            exportMthAve3mth = d3.mean(materialData3mth.map(d => d['Export'])),
            exportMthAve1yr =  d3.mean(materialData1yr.map(d => d['Export']) ),
            exportMthAve3yr =  d3.mean(materialData3yr.map(d => d['Export']) ),
            exportMthAve5yr =  d3.mean(materialData5yr.map(d => d['Export']) ),

            exportVsAve3mth = thisMonthExport / exportMthAve3mth - 1,
            exportVsAve1yr = thisMonthExport / exportMthAve1yr - 1,
            exportVsAve3yr = thisMonthExport / exportMthAve3yr - 1,
            exportVsAve5yr = thisMonthExport / exportMthAve5yr - 1,

                // Collection trends: Landfill
            landfillMthAve3mth = d3.mean(materialData3mth.map(d => d['Landfill'])),
            landfillMthAve1yr =  d3.mean(materialData1yr.map(d => d['Landfill']) ),
            landfillMthAve3yr =  d3.mean(materialData3yr.map(d => d['Landfill']) ),
            landfillMthAve5yr =  d3.mean(materialData5yr.map(d => d['Landfill']) ),

            landfillVsAve3mth = thisMonthLandfill / landfillMthAve3mth - 1,
            landfillVsAve1yr = thisMonthLandfill / landfillMthAve1yr - 1,
            landfillVsAve3yr = thisMonthLandfill / landfillMthAve3yr - 1,
            landfillVsAve5yr = thisMonthLandfill / landfillMthAve5yr - 1

        // Update data strings 
        // Recyclables collected  (left)
        d3.select('#recyclables-collected-subheader').html(`Destinations of kerbside collection in ${monthYear}`)   
        d3.select('#collected-total').html(`${helpers.numberFormatters.formatComma(thisMonthTotalVolume)}` )
        d3.select('#collected-vs-last-change').html(vsLastTotalVolume === 0 ? 'no change' :  `${helpers.numberFormatters.formatComma(vsLastTotalVolume)} tonne ${vsLastTotalVolume > 0 ? 'increase' : 'decrease'}`)
        d3.select('#collected-vs-last-pct').html(vsLastTotalVolume === 0 ? '' :  vsLastTotalVolume > 0 ? `+${helpers.numberFormatters.formatPct1dec(vsLastTotalPct)}` :  helpers.numberFormatters.formatPct1dec(vsLastTotalPct))
        // Destination of Recyclables collected (right)
        d3.select('#destination-table-local-reprocessing-tonnes').html(`${helpers.numberFormatters.formatComma(thisMonthlocalReprocessing)}`)
        d3.select('#destination-table-local-reprocessing-proportion').html(`${helpers.numberFormatters.formatPct1dec(thisMonthlocalReprocessing / thisMonthTotalVolume)}`)
        d3.select('#destination-table-export-tonnes').html(`${helpers.numberFormatters.formatComma(thisMonthExport)}`)
        d3.select('#destination-table-export-proportion').html(`${helpers.numberFormatters.formatPct1dec(thisMonthExport / thisMonthTotalVolume)}`)
        d3.select('#destination-table-landfill-tonnes').html(`${helpers.numberFormatters.formatComma(thisMonthLandfill)}`)
        d3.select('#destination-table-landfill-proportion').html(`${helpers.numberFormatters.formatPct1dec(thisMonthLandfill / thisMonthTotalVolume)}`)
        // Destination trend indicators: all materials
        d3.select('#destination-trend-chart-header').html(`12 mth trend to ${mthYr}`)
        d3.select('#destination-3mth-ave-vol').html(helpers.numberFormatters.formatComma(totalVolMthAve3mth))
        d3.select('#destination-1yr-ave-vol').html(helpers.numberFormatters.formatComma(totalVolMthAve1yr))
        d3.select('#destination-3yr-ave-vol').html(helpers.numberFormatters.formatComma(totalVolMthAve3yr))
        d3.select('#destination-5yr-ave-vol').html(helpers.numberFormatters.formatComma(totalVolMthAve5yr))
        d3.select('#collection-comparison-table-header').html(`Comparison of <strong>${helpers.numberFormatters.formatComma(thisMonthTotalVolume)}</strong> tonnes collected in ${monthYear} vs historical averages`)
        d3.select('#collected-3mth-total-pct').html(totalVolMthAve3mth ===  0 ? 'na' : totalVolVsAve3mth > 0 ? `+${helpers.numberFormatters.formatPct1dec(totalVolVsAve3mth)}` : helpers.numberFormatters.formatPct1dec(totalVolVsAve3mth))
        d3.select('#collected-1yr-total-pct').html(totalVolMthAve1yr ===  0 ? 'na' : totalVolVsAve1yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(totalVolVsAve1yr)}` :  helpers.numberFormatters.formatPct1dec(totalVolVsAve1yr))
        d3.select('#collected-3yr-total-pct').html(totalVolMthAve3yr ===  0 ? 'na' : totalVolVsAve3yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(totalVolVsAve3yr)}` :  helpers.numberFormatters.formatPct1dec(totalVolVsAve3yr))
        d3.select('#collected-5yr-total-pct').html(totalVolMthAve5yr ===  0 ? 'na' : totalVolVsAve5yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(totalVolVsAve5yr)}` :  helpers.numberFormatters.formatPct1dec(totalVolVsAve5yr))

        // All tables comparison label
        d3.selectAll('.comparison-label').html(`${mthYr} vs monthly ave.`)

        // Destination trend indicators: Local reprocessing
        d3.select('#local-reprocessing-trend-chart-header').html(`12 mth trend to ${mthYr}`)
        d3.select('#local-reprocessing-comparison-table-header').html(`Comparison of <strong>${helpers.numberFormatters.formatComma(thisMonthlocalReprocessing)}</strong> tonnes sent to local reprocessors in ${monthYear} vs historical averages`)
        d3.select('#local-reprocessing-3mth-ave-vol').html(helpers.numberFormatters.formatComma(localReprocessingMthAve3mth))
        d3.select('#local-reprocessing-1yr-ave-vol').html(helpers.numberFormatters.formatComma(localReprocessingMthAve1yr))
        d3.select('#local-reprocessing-3yr-ave-vol').html(helpers.numberFormatters.formatComma(localReprocessingMthAve3yr))
        d3.select('#local-reprocessing-5yr-ave-vol').html(helpers.numberFormatters.formatComma(localReprocessingMthAve5yr))
        d3.select('#local-reprocessing-3mth-pct').html(localReprocessingMthAve3mth === 0 ? 'na' : localReprocessingVsAve3mth > 0 ? `+${helpers.numberFormatters.formatPct1dec(localReprocessingVsAve3mth)}` : helpers.numberFormatters.formatPct1dec(localReprocessingVsAve3mth))
        d3.select('#local-reprocessing-1yr-pct').html(localReprocessingMthAve1yr === 0 ? 'na' : localReprocessingVsAve1yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(localReprocessingVsAve1yr)}` :  helpers.numberFormatters.formatPct1dec(localReprocessingVsAve1yr))
        d3.select('#local-reprocessing-3yr-pct').html(localReprocessingMthAve3yr === 0 ? 'na' : localReprocessingVsAve3yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(localReprocessingVsAve3yr)}` :  helpers.numberFormatters.formatPct1dec(localReprocessingVsAve3yr))
        d3.select('#local-reprocessing-5yr-pct').html(localReprocessingMthAve5yr === 0 ? 'na' : localReprocessingVsAve5yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(localReprocessingVsAve5yr)}` :  helpers.numberFormatters.formatPct1dec(localReprocessingVsAve5yr))

        // Destination trend indicators: Export
        d3.select('#export-trend-chart-header').html(`12 mth trend to ${mthYr}`)
        d3.select('#export-comparison-table-header').html(`Comparison of <strong>${helpers.numberFormatters.formatComma(thisMonthExport)}</strong> tonnes exported <br>in ${monthYear} vs historical averages`)
        d3.select('#export-3mth-ave-vol').html(helpers.numberFormatters.formatComma(exportMthAve3mth))
        d3.select('#export-1yr-ave-vol').html(helpers.numberFormatters.formatComma(exportMthAve1yr))
        d3.select('#export-3yr-ave-vol').html(helpers.numberFormatters.formatComma(exportMthAve3yr))
        d3.select('#export-5yr-ave-vol').html(helpers.numberFormatters.formatComma(exportMthAve5yr))
        d3.select('#export-3mth-pct').html(exportMthAve3mth === 0 ? 'na' : exportVsAve3mth > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportVsAve3mth)}` : helpers.numberFormatters.formatPct1dec(exportVsAve3mth))
        d3.select('#export-1yr-pct').html(exportMthAve1yr === 0 ? 'na' :exportVsAve1yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportVsAve1yr)}` :  helpers.numberFormatters.formatPct1dec(exportVsAve1yr))
        d3.select('#export-3yr-pct').html(exportMthAve3yr === 0 ? 'na' :exportVsAve3yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportVsAve3yr)}` :  helpers.numberFormatters.formatPct1dec(exportVsAve3yr))
        d3.select('#export-5yr-pct').html(exportMthAve5yr === 0 ? 'na' :exportVsAve5yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportVsAve5yr)}` :  helpers.numberFormatters.formatPct1dec(exportVsAve5yr))

        // Destination trend indicators: Landfill
        d3.select('#landfill-trend-chart-header').html(`12 mth trend to ${mthYr}`)
        d3.select('#landfill-comparison-table-header').html(`Comparison of <strong>${helpers.numberFormatters.formatComma(thisMonthLandfill)}</strong> tonnes of collection that goes to landfill in ${monthYear} vs historical averages`)
        d3.select('#landfill-3mth-ave-vol').html(helpers.numberFormatters.formatComma(landfillMthAve3mth))
        d3.select('#landfill-1yr-ave-vol').html(helpers.numberFormatters.formatComma(landfillMthAve1yr))
        d3.select('#landfill-3yr-ave-vol').html(helpers.numberFormatters.formatComma(landfillMthAve3yr))
        d3.select('#landfill-5yr-ave-vol').html(helpers.numberFormatters.formatComma(landfillMthAve5yr))

        d3.select('#landfill-3mth-pct').html(landfillMthAve3mth === 0 ? 'na' : landfillVsAve3mth > 0 ? `+${helpers.numberFormatters.formatPct1dec(landfillVsAve3mth)}` : helpers.numberFormatters.formatPct1dec(landfillVsAve3mth))
        d3.select('#landfill-1yr-pct').html(landfillMthAve1yr === 0 ? 'na' : landfillVsAve1yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(landfillVsAve1yr)}` :  helpers.numberFormatters.formatPct1dec(landfillVsAve1yr))
        d3.select('#landfill-3yr-pct').html(landfillMthAve3yr === 0 ? 'na' : landfillVsAve3yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(landfillVsAve3yr)}` :  helpers.numberFormatters.formatPct1dec(landfillVsAve3yr))
        d3.select('#landfill-5yr-pct').html(landfillMthAve5yr === 0 ? 'na' : landfillVsAve5yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(landfillVsAve5yr)}` :  helpers.numberFormatters.formatPct1dec(landfillVsAve5yr))

        // Update bar chart
        let barChartData = [],  maxDestination
        Object.entries(thisMonthData).forEach(([key, value]) => {
            if(key !== 'date'){
                barChartData.push({[key]: value})
            }
        })
        barChartData.sort((a, b) => (Object.values(a)[0] < Object.values(b)[0]) ? 1 : -1 )
        maxDestination = Object.values(barChartData[0])[0]
        barChartData = barChartData.map(d => {
            return {[Object.keys(d)[0]]:  Object.values(d)[0] / maxDestination}
        })
        barChartData.forEach(obj => {
            const slugName = helpers.slugify(Object.keys(obj)[0]),
                pct = helpers.numberFormatters.formatPct1dec(Object.values(obj)[0])
            d3.select(`#destination-table-${slugName}-bar`)
                .style('width', 0)
                .transition().duration(2000)
                .style('width', pct)
        })

        // Add sparkline area charts: Settings object with "y0: true" is passed in to show sparkline area charts starting from zero tonnes on the y-axis
        const collection12mthData =  materialData1yr.map(d => d['Local reprocessing'] + d['Export'] + d['Landfill'])
            localReprocessing12mthData = materialData1yr.map(d => d['Local reprocessing']),
            export12mthData = materialData1yr.map(d => d['Export']),
            landfill12mthData = materialData1yr.map(d => d['Landfill'])

        charts.methods.renderSparkarea('destination-trend-chart', collection12mthData, {yDomain: 'includeZero', areaClass: 'all'})
        charts.methods.renderSparkarea('local-reprocessing-trend-chart', localReprocessing12mthData,  {yDomain: 'includeZero', areaClass: 'local-reprocessing'})
        charts.methods.renderSparkarea('export-trend-chart', export12mthData,  {yDomain: 'includeZero', areaClass: 'export'})
        charts.methods.renderSparkarea('landfill-trend-chart', landfill12mthData,  {yDomain: 'includeZero', areaClass: 'landfill'})
    };

    // Build the price card container
    async function buildPriceCards(material = state.material, date = state.date.price){
        // Clear the current cards
        const virginContainer = d3.select('#material-price-card-container-virgin'),
            mrfOutputContainer = d3.select('#material-price-card-container-mrfOutput')
        virginContainer.selectAll('*').remove()
        mrfOutputContainer.selectAll('*').remove()

        // Build each subtype card and append to either vigin or MRF output containers
        const materialPriceData = data.byMaterial[state.material].price
            materialVirginList = Object.keys(materialPriceData[0]['Virgin']),
            materialPriceMRFList = Object.keys(materialPriceData[0]['MRF output'])

        materialVirginList.forEach(type => buildPriceCard(virginContainer, type, 'Virgin', material, date))
        materialPriceMRFList.forEach(type => buildPriceCard(mrfOutputContainer, type, 'MRF output', material, date))
        
    };
        // Supporting function to build individual price sub-card
        async function buildPriceCard(container, type, valueChain, material = state.material, date = state.date.price){
            // Get data for material type (set in the state object)
            const slugType = helpers.slugify(type,)
                thisMonthString = date,
                thisMonthObject = new Date(date),
                materialData = data.byMaterial[material],
                priceData = data.byMaterial[material].price,
                thisMonthIndex = materialData.price.map(d => d.date.toString()).indexOf(thisMonthString),          
                monthYear = helpers.timeFormat.toMonthYear(thisMonthObject),
                mthYr =  helpers.timeFormat.toMthYr(thisMonthObject),
                thisMonthPrice = priceData[thisMonthIndex][valueChain][type],
                lastMonthPrice = priceData[thisMonthIndex-1][valueChain][type],
                priceData3mth = priceData.slice(thisMonthIndex -2, thisMonthIndex + 1).map(d => d[valueChain][type]).filter(d => d !== 'na'),
                priceData1yr = priceData.slice(thisMonthIndex -11, thisMonthIndex + 1).map(d => d[valueChain][type]).filter(d => d !== 'na'),
                priceData2yr = priceData.slice(thisMonthIndex -23, thisMonthIndex + 1).map(d => d[valueChain][type]).filter(d => d !== 'na'),
                priceData3yr = priceData.slice(thisMonthIndex -35, thisMonthIndex + 1).map(d => d[valueChain][type]).filter(d => d !== 'na'),
                priceHistoryLength = d3.max([priceData3mth.length, priceData1yr.length, priceData2yr.length, priceData3yr.length]),
                last3mthAvePrice = d3.mean(priceData3mth),
                last1yrAvePrice  = d3.mean(priceData1yr),
                last1yrLowPrice  = d3.min(priceData1yr),
                last1yrHighPrice = d3.max(priceData1yr),
                last2yrAvePrice  = d3.mean(priceData2yr),
                last2yrLowPrice  = d3.min(priceData2yr),
                last2yrHighPrice = d3.max(priceData2yr),
                last3yrAvePrice  = d3.mean(priceData3yr),
                last3yrLowPrice  = d3.min(priceData3yr),
                last3yrHighPrice = d3.max(priceData3yr),

                perfVsLast  = lastMonthPrice === 0 ? 0 : thisMonthPrice /  lastMonthPrice -1,
                perfVs3mth  = last3mthAvePrice === 0 ? 0 : thisMonthPrice /  last3mthAvePrice -1,
                perfVs1yr  = last1yrAvePrice === 0 ? 0 :thisMonthPrice /  last1yrAvePrice -1,
                seriesLength = priceData.map(d => d[valueChain][type]).filter(d => d !== 'na').length

            // Setup container and add data...
            const cardContainer = container.append('div').classed('material-price-card', true)
            cardContainer.append('h4').classed('material-price-card-header', true).html(type)
            // Headline price
            cardContainer.append('div').classed('price-label label', true)
                .html(`Estimated transaction price for <br>${monthYear}`)
            const priceLabelContainer = cardContainer.append('div').classed('material-price-headline-container', true)
                priceHeadline =  cardContainer.append('div'),
                priceLabel = priceHeadline.append('span').classed('material-price-headline', true).html(helpers.numberFormatters.formatCost2dec(thisMonthPrice)),
                priceUnit = priceHeadline.append('span').classed('material-price-unit', true).html('per tonne')

            // Price performance section
            cardContainer.append('div').classed('price-performance-label label', true)
                .html(`Performance to ${monthYear}`)
            const perfTblHeader =   cardContainer.append('div').classed('material-price-performance-table-container header', true)
            perfTblHeader.append('div').classed('table-data material-price-trend-header', true).html('12mth trend')
            perfTblHeader.append('div').classed('table-data material-price-comp-header', true).html('Price history and performance vs last...')

            perfTblHeader.append('div').classed('table-data material-price-lastMth-header align-right', true).html('Month')
            perfTblHeader.append('div').classed('table-data material-price-3mth-header align-right', true).html('3 mth ave.')
            perfTblHeader.append('div').classed('table-data material-price-12mth-header align-right', true).html('12mth ave.')
            const perfTblRow =   cardContainer.append('div').classed('material-price-performance-table-container', true)
            perfTblRow.append('div').classed('table-price-trend-chart-container', true)
                .append('svg').attr('id', `${slugType}-chart`).attr('width', '100%')
            perfTblRow.append('div').classed('table-data align-right', true)
                .html(helpers.numberFormatters.formatCost2dec(lastMonthPrice))
            perfTblRow.append('div').classed('table-data align-right', true)
                .html(helpers.numberFormatters.formatCost2dec(last3mthAvePrice))
            perfTblRow.append('div').classed('table-data align-right', true)
                .html(helpers.numberFormatters.formatCost2dec(last1yrAvePrice))
            perfTblRow.append('div').classed('table-data align-right', true)
                .html(perfVsLast > 0 ? `+${helpers.numberFormatters.formatPct1dec(perfVsLast)}` : helpers.numberFormatters.formatPct1dec(perfVsLast))
            perfTblRow.append('div').classed('table-data align-right', true)
                .html(perfVs3mth > 0 ? `+${helpers.numberFormatters.formatPct1dec(perfVs3mth)}` : helpers.numberFormatters.formatPct1dec(perfVs3mth))
            perfTblRow.append('div').classed('table-data align-right', true)
                .html(perfVs1yr > 0 ? `+${helpers.numberFormatters.formatPct1dec(perfVs1yr)}` : helpers.numberFormatters.formatPct1dec(perfVs1yr))


            // Price history (high-ave-low) section
            cardContainer.append('div').classed('price-history-label label', true).html('Price history')
            const historyTblHeader =   cardContainer.append('div').classed('material-history-performance-table-container header', true)
            historyTblHeader.append('div').classed('material-history-table-period table-data', true).html('Over the last')
            historyTblHeader.append('div').classed('material-history-table-low table-data align-right', true).html('Low')
            historyTblHeader.append('div').classed('material-history-table-ave table-data align-right', true).html('Ave.')
            historyTblHeader.append('div').classed('material-history-table-high table-data align-right', true).html('High')

            if(seriesLength >= 12){
                const historyTblRow1yr  =   cardContainer.append('div').classed('material-history-performance-table-container', true)
                historyTblRow1yr.append('div').classed('material-history-table-period table-data', true).html('1 year')
                historyTblRow1yr.append('div').classed('material-history-table-low table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last1yrLowPrice))
                historyTblRow1yr.append('div').classed('material-history-table-ave table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last1yrAvePrice))
                historyTblRow1yr.append('div').classed('material-history-table-high table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last1yrHighPrice))
            }
            if(seriesLength >= 24){
                const historyTblRow2yr = cardContainer.append('div').classed('material-history-performance-table-container', true)
                historyTblRow2yr.append('div').classed('material-history-table-period table-data', true).html('2 years')
                historyTblRow2yr.append('div').classed('material-history-table-low table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last2yrLowPrice))
                historyTblRow2yr.append('div').classed('material-history-table-ave table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last2yrAvePrice))
                historyTblRow2yr.append('div').classed('material-history-table-high table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last2yrHighPrice))
            }   
            if(seriesLength >= 36){
                const historyTblRow3yr = cardContainer.append('div').classed('material-history-performance-table-container', true)
                historyTblRow3yr.append('div').classed('material-history-table-period table-data', true).html('3 years')
                historyTblRow3yr.append('div').classed('material-history-table-low table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last3yrLowPrice))
                historyTblRow3yr.append('div').classed('material-history-table-ave table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last3yrAvePrice))
                historyTblRow3yr.append('div').classed('material-history-table-high table-data align-right', true)
                    .html(helpers.numberFormatters.formatCost2dec(last3yrHighPrice))
            }

            // Add sparkline
            charts.methods.renderSparkline(`${slugType}-chart`, priceData1yr, {yDomain: 'indexed'})
        };

    // Build the export card
    async function buildExportCard(material = state.material, date = state.date.export){
        const container = d3.select('.export-market-table-container'),
            thisMonthString = date,
            thisMonthObject = new Date(date),
            priceData = data.byMaterial[material],
            thisMonthIndex = materialData.export.map(d => d.date.toString()).indexOf(thisMonthString),          
            monthYear = helpers.timeFormat.toMonthYear(thisMonthObject),
            mthYr =  helpers.timeFormat.toMthYr(thisMonthObject),
            thisMonthData = materialData.export[thisMonthIndex],
            thisMonthExport =  d3.sum(Object.values(thisMonthData).slice(Object.keys(thisMonthData).indexOf('date') + 1)),

            lastMonthData = materialData.export[thisMonthIndex -1],
            lastMonth    = materialData.export[thisMonthIndex -1].date,
            lastMonthExport  = d3.sum(Object.values(lastMonthData).slice(Object.keys(lastMonthData).indexOf('date') + 1)),
            lastMthYr    = helpers.timeFormat.toMthYr(lastMonth), 

            exportData3mth = materialData.export.slice(thisMonthIndex -2, thisMonthIndex + 1),
            exportData1yr = materialData.export.slice(thisMonthIndex -11, thisMonthIndex + 1),
            exportData3yr = materialData.export.slice(thisMonthIndex -35, thisMonthIndex + 1),
            exportData5yr = materialData.export.slice(thisMonthIndex -59, thisMonthIndex + 1)

        // Clear DOM then build
        container.selectAll('.export-market-table-rows').remove()

        d3.select('#export-market-subheader').html(`Breakdown by country of <strong>${helpers.numberFormatters.formatComma(thisMonthExport)} tonnes of ${state.material.toLowerCase()} exported</strong> in ${monthYear}. Individual countries are ranked (most to least) by total exports over the past three months`)
        const tableHeaderRow1 = container.append('div').classed('export-market-table-rows', true)
        tableHeaderRow1.append('div').classed('export-market-table-header-volumes table-header', true).html('Export volume (tonnes)')
        tableHeaderRow1.append('div').classed('export-market-table-header-vsHistorical table-header', true).html('vs historical averages of monthly export (tonnes)')
        const tableHeaderRow2 = container.append('div').classed('export-market-table-rows', true)
        tableHeaderRow2.append('div').classed('export-market-table-country-header table-data', true).html('Country')
        tableHeaderRow2.append('div').classed('export-market-table-trend-header table-data', true).html('Trend')
        tableHeaderRow2.append('div').classed('export-market-table-currentMonth-header table-data align-right', true).html(mthYr)
        tableHeaderRow2.append('div').classed('export-market-table-lastMonth-header table-data align-right', true).html(lastMthYr)
        tableHeaderRow2.append('div').classed('export-market-table-3mth-header table-data align-right', true).html('3 mth')
        tableHeaderRow2.append('div').classed('export-market-table-1yr-header table-data align-right', true).html('1 year')
        tableHeaderRow2.append('div').classed('export-market-table-3yr-header table-data align-right', true).html('3 years')
        tableHeaderRow2.append('div').classed('export-market-table-5yr-header table-data align-right', true).html('5 years')

        // Ranking the countries by last 3 months volume
        let countryList = Object.keys(thisMonthData).filter(d => d !== 'All other countries' && d !== 'date'),
            sortedTotals = countryList.map(country => {
                return {[country]: d3.sum(exportData3mth.map(d => d[country]))}
            })
        sortedTotals.sort((a, b) => (Object.values(a)[0] < Object.values(b)[0]) ? 1 : -1 )
        countryList = sortedTotals.map(d => Object.keys(d)[0])
        if(Object.keys(thisMonthData).indexOf('All other countries') > -1){
            countryList.push('All other countries')             // Add 'All other countries' as last item in list (if it exists)
        }

        // Add rows for ranked country list (with all other countries last)
        countryList.forEach( country => {
            // Get data
            const countrySlug = helpers.slugify(country),  
                thisMonthCountryData = thisMonthData[country],
                lastMonthCountryData = lastMonthData[country],
                exportCountryData3mth = exportData3mth.map(d => d[country]),
                exportCountryData1yr = exportData1yr.map(d => d[country]),
                exportCountryData3yr = exportData3yr.map(d => d[country]),
                exportCountryData5yr = exportData5yr.map(d => d[country]),
                exportCountryData3mthAve = d3.mean(exportCountryData3mth),
                exportCountryData1yrAve = d3.mean(exportCountryData1yr),
                exportCountryData3yrAve = d3.mean(exportCountryData3yr),
                exportCountryData5yrAve = d3.mean(exportCountryData5yr),
                exportCountryDataLastMthComp = lastMonthCountryData === 0 ? 'na' : thisMonthCountryData / lastMonthCountryData -1,
                exportCountryData3mthComp = exportCountryData3mthAve === 0 ? 'na' : thisMonthCountryData / exportCountryData3mthAve -1,
                exportCountryData1yrComp = exportCountryData1yrAve === 0 ? 'na' : thisMonthCountryData / exportCountryData1yrAve -1,
                exportCountryData3yrComp = exportCountryData3yrAve === 0 ? 'na' : thisMonthCountryData / exportCountryData3yrAve -1,
                exportCountryData5yrComp = exportCountryData5yrAve === 0 ? 'na' :  thisMonthCountryData / exportCountryData5yrAve -1

            // Build DOM
            const countryRow = container.append('div').classed('export-market-table-rows', true)
            countryRow.append('div').classed('export-market-table-country-name table-data', true).html(country)
            countryRow.append('div').classed('export-market-table-trend-chart', true)
                    .append('svg').attr('id', `${countrySlug}-sparkline`).attr('width', '100%')         // Sparkline SVG
            countryRow.append('div').classed('export-market-table-currentMonth table-data align-right', true).html(helpers.numberFormatters.formatComma(thisMonthCountryData))
            countryRow.append('div').classed('export-market-table-lastMonth table-data align-right', true).html(helpers.numberFormatters.formatComma(lastMonthCountryData))
            countryRow.append('div').classed('export-market-table-3mth table-data align-right', true).html(helpers.numberFormatters.formatComma(exportCountryData3mthAve))
            countryRow.append('div').classed('export-market-table-1yr table-data align-right', true).html(helpers.numberFormatters.formatComma(exportCountryData1yrAve))
            countryRow.append('div').classed('export-market-table-3yr table-data align-right', true).html(helpers.numberFormatters.formatComma(exportCountryData3yrAve))
            countryRow.append('div').classed('export-market-table-5yr table-data align-right', true).html(helpers.numberFormatters.formatComma(exportCountryData5yrAve))
            countryRow.append('div').classed('export-market-table-currentMonth-comp table-data align-right', true).html('Compared &#8594;')
            countryRow.append('div').classed('export-market-table-lastMonth-comp table-data align-right', true).html(lastMonthCountryData === 0 ? 'na' : exportCountryDataLastMthComp > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportCountryDataLastMthComp)}` : helpers.numberFormatters.formatPct1dec(exportCountryDataLastMthComp) )
            countryRow.append('div').classed('export-market-table-3mth-comp table-data align-right', true).html(exportCountryData3mthAve === 0 ? 'na' : exportCountryData3mthComp > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportCountryData3mthComp)}` : helpers.numberFormatters.formatPct1dec(exportCountryData3mthComp) )
            countryRow.append('div').classed('export-market-table-1yr-comp table-data align-right', true).html(exportCountryData1yrAve === 0 ? 'na' : exportCountryData1yrComp > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportCountryData1yrComp)}` : helpers.numberFormatters.formatPct1dec(exportCountryData1yrComp) )
            countryRow.append('div').classed('export-market-table-3yr-comp table-data align-right', true).html(exportCountryData3yrAve === 0 ? 'na' : exportCountryData3yrComp > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportCountryData3yrComp)}` : helpers.numberFormatters.formatPct1dec(exportCountryData3yrComp) )
            countryRow.append('div').classed('export-market-table-5yr-comp table-data align-right', true).html(exportCountryData5yrAve === 0 ? 'na' : exportCountryData5yrComp > 0 ? `+${helpers.numberFormatters.formatPct1dec(exportCountryData5yrComp)}` : helpers.numberFormatters.formatPct1dec(exportCountryData5yrComp) )

            // Add sparkline
            charts.methods.renderSparkline(`${countrySlug}-sparkline`, exportCountryData1yr, {yDomain: 'indexed'})    
        })
    };

    // Fade in animation 
    async function revealDashboard(){
        // Transition to reveal cards
        d3.select('#material-title').html(state.material)
        d3.selectAll('#material-title, .sub-card').transition().duration(800).delay((d,i) => i * 100).style('opacity', 1)
        // Set the 
    };   

    // Update the dashboard data for material and/or date selection
    async function updateDashboard(){
        if(document.getElementById('materials-selector')){
            state.material =  document.getElementById('materials-selector').value
        }
        if(document.getElementById('date-selector')){
            state.date.volume = document.getElementById('date-selector').value
            state.date.price = document.getElementById('date-selector').value
            state.date.export = document.getElementById('date-selector').value
        }

    if(d3.select('.main-container').classed('single-component')){
        d3.select('.main-container').attr('class', `main-container single-component ${helpers.slugify(state.material)}`)
    } else {
        d3.select('.main-container').attr('class', `main-container ${helpers.slugify(state.material)}`)
    }

        await buildDashboard()
    };


/////////////////////////////
///// SPARKLINE CHARTS  ///// 
/////////////////////////////

    charts.methods.renderSparkline = function(svgID, data, settings = {}){
        d3.select(`#${svgID} *`).remove()
        // a. Data transform if sparkline is indexed
            if(settings.yDomain === 'indexed'){
                if(data[0] !== 0){  // If starting value is non-zero
                    data = data.map(d => d / data[0] - 1)
                }                   // Note; the the starting value is zero, ignore the indexing transform (this is an edge case but still shows a representative sparkline)
            }

        // a. SVG and chart dimensions (note: width and height are scaled to the container dimensions => use for setting chart aspect ratio. CSS used for setting stroke and market styling)
        const dims = {
            width: 200,
            height: 100,
            margin: { top: 15, right: 5, bottom: 15, left: 5 }
        }
        dims.chartHeight = dims.height - dims.margin.top - dims.margin.bottom       // Chart dimensions include the margin
        dims.chartWidth = dims.width - dims.margin.left - dims.margin.right
        // b. Setup SVG element for dimensions 
        const svg = d3.select('#'+svgID)
                .attr('viewBox', `0 0 ${dims.width} ${dims.height}`),                           // Setting the viewBox allows the SVg element to scale to its HTML continer size 
            chart = svg.append('g')    
                .attr('transform', `translate(${dims.margin.left} , ${dims.margin.top} )`);     // Group element for the chart 
        // b. Setup x and y scales.  
        const yDomain =  settings.yDomain === 'includeZero' ? d3.max(data) > 0 ? [0, d3.max(data)] : [d3.min(data, 0)]                             // If settings.y0 is specified as true, extend the domain to zero on the y xis (for both positive and negative series)
                    : settings.yDomain === 'indexed' ? [-d3.max(data.map(d => Math.abs(d)))  , d3.max(data.map(d => Math.abs(d))) ]          // If indexed then set an even with teh "absolute max: as extent =? this ensures a sparkline startign in "vertical center" with equal  
                        : d3.extent(data),                                                              // Or else use the y data extent (min and max) to set the domain (this emphasises the 'trend' at the expense of showing changes relative to zero)         
            xScale = d3.scaleLinear().domain([0, data.length]).range([0, dims.chartWidth ]),
            yScale = d3.scaleLinear().domain(yDomain).range([dims.chartHeight, 0]);

        // c.Setup the 'shape generator' function for a line: this takes data points (inputs) and creates an SVG path string for that data, using the scales 
        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d));
        // d. Render sparkline path and start/end markers
        chart.append('path').classed('sparkline', true)                                 // Append an SVG path for the sparkline
            .datum(data)                                                                // ..using the supplied data array
            .attr('d', line);                                                           // ..and line generator
        chart.append('circle').classed('sparkline-start-point', true)                   // Append circle marker at the start of the line
            .attr('cx', xScale(0))
            .attr('cy', yScale(data[0]))
        chart.append('circle').classed('sparkline-end-point', true)                    // Append circle marker at the end of the line
            .attr('cx', xScale(data.length - 1))
            .attr('cy', yScale(data[data.length - 1]))
    }; // end renderSparkline

    charts.methods.renderSparkarea = function(svgID, data, settings = {}){
        d3.select(`#${svgID} *`).remove()
        if(d3.sum(data) !== 0){
            // a. SVG and chart dimensions (note: width and height are scaled to the container dimensions => use for setting chart aspect ratio. CSS used for setting stroke and market styling)
            const dims = {
                width: 200,
                height: 65,
                margin: { top: 15, right: 5, bottom: 0, left: 0 }
            }

            dims.chartHeight = dims.height - dims.margin.top - dims.margin.bottom       // Chart dimensions include the margin
            dims.chartWidth = dims.width - dims.margin.left - dims.margin.right
            // b. Setup SVG element for dimensions 
            const svg = d3.select('#'+svgID)
                    .attr('viewBox', `0 0 ${dims.width} ${dims.height}`),                           // Setting the viewBox allows the SVg element to scale to its HTML continer size 
                chart = svg.append('g')    
                    .attr('transform', `translate(${dims.margin.left} , ${dims.margin.top} )`);     // Group element for the chart 
            // b. Setup x and y scales.  
            const yDomain =  settings.yDomain === 'includeZero' ? d3.max(data) > 0 ?[0, d3.max(data)] : [d3.min(data, 0)]  // If settings.y0 is specified as true, extend the domain to zero on the y xis (for both positive and negative series)
                    : d3.extent(data),                                                              // Or else use the y data extent (min and max) to set the domain (this emphasises the 'trend' at the expense of showing changes relative to zero)         
                xScale = d3.scaleLinear().domain([0, data.length]).range([0, dims.chartWidth ]),
                yScale = d3.scaleLinear().domain(yDomain).range([dims.chartHeight, 0]);

            // c.Setup the 'shape generator' function for a line: this takes data points (inputs) and creates an SVG path string for that data, using the scales 
            const area = d3.area()
                .x((d, i) => xScale(i))
                .y0(d => yScale(0))
                .y1(d => yScale(d))
            // d. Render sparkarea path 
            chart.append('path').classed(`sparkarea`, true)                                 // Append an SVG path for the sparkline
                .datum(data)                                                          // ..using the supplied data array
                .attr('d', area)                                                           // ..and line generator
        }
    }; // end renderSparkarea

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
            parseDate:              d3.timeParse("%B %d, %Y"),
            parseMthYear:            d3.timeParse("%b-%Y")
        },
        timeFormat:{
            toMonthDayYear:            d3.timeFormat("%B %d, %Y"),
            toMonthFull:               d3.timeFormat("%B"),
            toMonthYear:               d3.timeFormat("%B %Y"),
            toMthYr:                   d3.timeFormat("%b %y")
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
        }
    }

//////////////////////////
//// SETTINGS OBJECT  //// 
//////////////////////////

    const settings  = {
        tableID:                'market-capacity-table',
        dataTable:              'data_marketCapacity',
        state: {           
            material:           'Paper and paperboard',    // This is the 'display' title for the edition and is used for general labelling
            date:               'Jan-2021'                               // Date (month) of data for each section
        },
        queryParameters:       {},        // Used to store URL query string items
        assessmentColorBgMap: {           // Mapping of assessment to CSS color or variable
            'n/a':              'var(--secondaryGreyLight)',
            'na':               'var(--secondaryGreyLight)',
            'N/A':              'var(--secondaryGreyLight)',
            'Very good':        'var(--tertiaryEmerald)',
            'Good':             'var(--tertiaryEmeraldLight)',
            'Okay':             'var(--tertiaryYellow)',
            'Okay (if sorted)': 'var(--tertiaryYellow)',
            'Poor':             'var(--tertiaryRedLight)',
            'Very poor':        'var(--tertiaryRed)',
        },
        assessmentColorTextMap: {           // Mapping of assessment to CSS color or variable
            'n/a':              '#000',
            'N/A':              '#000',
            'na':               '#000',
            'Very good':        '#fff',
            'Good':             '#000',
            'Okay':             '#000',
            'Okay (if sorted':  '#000',
            'Poor':             '#000',
            'Very poor':        '#fff',
            "Yes":              'var(--tertiaryEmerald)',
            "yes":              'var(--tertiaryEmerald)',
            "No":               'var(--tertiaryRed)',
            "No":               'var(--tertiaryRed)',
        }
    }

    const data = {
        tables:             {},
        schema: {
            lists: {
                date:           {},
                materials:      {},
                fields:         {}
            }
        }
    }


/////////////////////////////////////////
//// INIT FUNCTION (CALLED ON LOAD)  //// 
/////////////////////////////////////////

    buildFromGSheetData(settings) 

    //  1. Load data and call to build sequence
    function buildFromGSheetData(config) {
        // Data table links for each table used from same Google Sheet
        const gsTableLinks =  {
            data_marketCapacity:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYe9XdZL2TKia_B1Ncw8eKuwNTiTFhzNST0PWuCNqIUEFBbOlqCpW3ri5odmhng2vpXa5lL3PTHhzD/pub?gid=352975485&single=true&output=tsv'
        }
        const tablesToLoad = Object.keys(gsTableLinks)
        let noLoadedTables = 0

        // Load each table as tsv source using Papa parse
        for (const [tableName, tableURL] of Object.entries(gsTableLinks))   {
            Papa.parse(tableURL,  {
                download: true,
                header: true,
                delimiter: '\t',    
                transformHeader: (d) => {   // Use this to record the table headers in order; and return data without transformation
                    if(!data.schema.lists.fields[tableName]){
                        data.schema.lists.fields[tableName] = []
                    }
                    if(d !== 'date' && d !== 'material'){
                        data.schema.lists.fields[tableName].push(d)
                    }
                    return d
                },                    
                complete: async (results) => {
                    parseTable(tableName, results.data)
                    noLoadedTables++
                    // Call to buildVis after all tables are loaded and parsed
                    if(noLoadedTables === tablesToLoad.length){
                        await applyQuerySettings(config)        // a.  Update (default) settings that might be set from query string
                        await buildCapabilityTable(config)                  // c. Build report
                    }
                }
            })
        }   

        // Table data parsing function
        const parseTable = async (tableName, tableData) => {
            data.tables[tableName] = tableData.map(row => {
                const newObj = {}
                Object.entries(row).forEach(([key, value]) => {
                    newObj[key] = isNaN(parseFloat(value.replace(/,/g, ''))) ? value : parseFloat(value.replace(/,/g, '')) 
                })
                return newObj
            })
        };

    }; // end buildFromGSheetData

    // a. Update settings from query string
    async function applyQuerySettings(config){
        // i. Create a date and material list
        data.schema.lists.date = [...new Set( data.tables[config.dataTable].map(d => d.date) )]
        data.schema.lists.material = [...new Set( data.tables[config.dataTable].map(d => d.material) )]
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('material')) { 
            settings.state.material = settings.queryParameters.get('material')  
        }

        settings.state.date = settings.queryParameters.get('date')  ? settings.queryParameters.has('date') : data.schema.lists.date[data.schema.lists.date.length - 1] 

    };

    async function buildCapabilityTable(config){
        const material = settings.state.material,
            tableData = data.tables[settings.dataTable].filter(d => d.date === settings.state.date && d.material === settings.state.material),
            tableHead = d3.select(`#${config.tableID}`).append('thead'),
            headerRow = tableHead.append('tr'),
            tableBody = d3.select(`#${config.tableID}`).append('tbody')

        // Add table headers
        data.schema.lists.fields[settings.dataTable].forEach((fieldName, i) => {
             headerRow.append('th')
                .attr('class', i === 0 ? 'product' : 'supply-chain' )
                .classed('table header', true)
                .html(fieldName)
        })
        tableHead.append('tr').classed('spacer-header', true)

        // Add table data
        tableData.forEach(d => {
            const row = tableBody.append('tr')

            data.schema.lists.fields[settings.dataTable].forEach((field, i) => {
                const entry = d[field].replace("Yes", "&#10003;").replace("yes", "&#10003;")
                                .replace("No", "&#10008;").replace("no", "&#10008;")
                row.append('td')
                    .attr('class',  i === 0 ? 'product' : 'supply-chain')
                    .classed(`table row ${helpers.slugify(d[field])}`, true)
                    .style('background-color', settings.assessmentColorBgMap[d[field]])
                    .style('color', settings.assessmentColorTextMap[d[field]])
                    .style('padding', d[field] === entry ? null : '0.15rem 0 0')
                    .style('font-size', d[field] === entry ? null : '3.5vw')
                    .html(entry)
            })
        })
    };                  


    const helpers= {
        numberParsers: {
            parseDateSlash:         d3.timeParse("%d/%m/%Y"),
        },
        timeFormat:{
            toMonthYear:            d3.timeFormat("%B %Y"),
            toMthYear:              d3.timeFormat("%b-%Y"),
                toMthYr:            d3.timeFormat("%b %y")
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
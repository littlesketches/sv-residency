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
        month:                  "",         // Month is set by query string, or defaults to the latest month in the data
        queryParameters:        {},          // Used to store URL query string items
        state: {                            // Used to store material and data state
            material:   null,                           
            date:       null                        
        },
        svgID:          'bin-composition-vis',
        tableName:      'data_binComposition',
        dims: {
            height:     720, 
            width:      540,
            margin: {
                top: 100, right: 50, bottom: 50, left: 100
            }
        }
    }

    // Data object
    const data = {
        table:             {},
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

    initVis(settings)      //  Load data and call to build sequence

    function initVis(config) {
        // 1. Setup and specification of data endpoint tables
        const dataTables =  ['data_binComposition']   // Table names matched to the dataEndpointURls object (held in the data-endpoints.js file)

        // 2. Asynchronous data load (with Promise.all) and D3 (Fetch API) 
        Promise.all(
            dataTables.map(d => d3.tsv(dataEndpointURLs[d]) )
        ).then( rawData => {
            // a. Parse each loaded data table and store in data.table object, using the parseTable helper 
            rawData.forEach((tableData, i) => {parseTable(dataTables[i], tableData) })
            return data.table
        }).then( async (data) => {
            // 3. Initiate vis build sequence with data now loaded
            await applyQuerySettings()            // a. Update (default) settings that might be set from query string
            await parseData(config)                     // b. Shape data            
            await renderVis(config)                      // d. Render vis
            d3.selectAll('.main-container')            // e. Reveal vis
                .transition().duration(1200)
                .style('opacity', null)     
        })

        // X. Table data and date parsing function: trim() header white space and prase numbers with "$" and "," stripped. 
        const parseTable = async (tableName, tableData) => {
            data.table[tableName] = tableData.map(row => {
                const newObj = {}
                Object.entries(row).forEach(([key, value]) => {
                    switch(key.toLowerCase()){
                        case 'date':
                            newObj.month =  helpers.timeFormat.toMthYear(helpers.numberParsers.parseDateSlash(value))
                            newObj.date  =  helpers.numberParsers.parseDateSlash(value)
                            break     
                        default:
                            newObj[key] = isNaN(parseFloat(value.replace(/,/g, ''))) ? value : parseFloat(value.replace(/,/g, '')) 
                    }
                })
                return newObj
            })
        };
    }; // end initVis()

    // a. Update settings from query string
    async function applyQuerySettings(){
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('month')) { 
            settings.month = settings.queryParameters.get('month')  
        }
    }; // end applyQuerySettings()

    // b. Parse/shape data for rendering
    async function parseData(settings){
        //  Reshape data: data lists and shape by material
        const binData = data.table[settings.tableName]
        // Extract Date lists
        data.schema.lists.date = [...new Set(binData.map(d => d.date))].sort((a, b) => b - a)      // Take unique only (for flows data)
        data.schema.lists.month = data.schema.lists.date.map(d => helpers.timeFormat.toMthYear(d) )
        // Set date to be latest month
        settings.month = data.schema.lists.month[0]
        // Extract materials list (sorted alphabetically)
        data.schema.lists.materials = [...new Set(  
            Object.keys(binData[0])
                .filter(d => d !== 'month' && d !== 'date' && d.toLowerCase() !== 'contamination') 
        )].sort()
    }; // end parseData()

    
    /////////////////////////////////
    // 2. RENDER THE BIN GRAPHIC  ///
    /////////////////////////////////

    async function renderVis(settings){
        // 0. Data and icon setup
        const binData = data.table[settings.tableName]
        let binMonthData = binData.filter(d => d.month === settings.month)[0]
        delete binMonthData.month
        delete binMonthData.date

        binMonthData = Object.entries(binMonthData).sort( (a,b) => a[1] -b[1])  // Order from least to most (most will be bottom layer)
        const contaminationIndex = binMonthData.map(d => d[0].toLowerCase()).indexOf('contamination'),      // Extract and reattached contamination
            contaminationData =    binMonthData.slice(contaminationIndex, contaminationIndex + 1)[0]
        binMonthData.splice(contaminationIndex, 1)
        binMonthData.unshift(contaminationData)     // Put contamination at start of data (appears on top of the bin)

        const icons = {
            bin:        "M16.444-2.62a.889.864 0 01-.888.864.889.864 0 01-.89-.864.889.864 0 01.89-.865.889.864 0 01.888.865M15.4-6.07l.582-12.974H1.796l.8 17.776c.028.693.615 1.24 1.328 1.24h9.29A3.386 3.386 0 0112.2-3.77c.482-1.33 1.75-2.242 3.199-2.3zm4.156-15.567h-1.334v.865h1.334a.438.438 0 00.444-.432.438.438 0 00-.444-.433zM15.809-5.2h-.005a2.348 2.348 0 00-.248-.013c-1.456-.008-2.652 1.116-2.694 2.531-.042 1.415 1.085 2.604 2.539 2.678 1.453.075 2.702-.993 2.813-2.404.111-1.412-.957-2.651-2.405-2.792zm-.253 4.308c-.982 0-1.778-.773-1.778-1.728s.796-1.729 1.778-1.729c.981 0 1.777.774 1.777 1.729 0 .458-.187.898-.52 1.222a1.803 1.803 0 01-1.257.506zm1.333-19.015a.439.439 0 00.444-.432v-.432H.444A.438.438 0 000-20.34c0 .239.199.432.444.432zm.444-2.16c0-.24-.199-.433-.444-.433H2.667c-.565 0-1.069.347-1.258.864h15.924z",
            binBody:    "M15.4-6.069l.582-12.974H1.796l.8 17.776c.028.693.615 1.24 1.328 1.24h9.29A3.386 3.386 0 0112.2-3.77c.482-1.33 1.75-2.242 3.199-2.3z",
            binWheel:   "M16.444-2.62a.877.877 0 01-.888.864.877.877 0 01-.89-.864c0-.478.399-.865.89-.865.49 0 .888.387.888.865M15.81-5.2h-.005a2.348 2.348 0 00-.248-.013c-1.456-.008-2.652 1.116-2.694 2.531-.042 1.415 1.085 2.604 2.539 2.678 1.453.075 2.702-.993 2.813-2.404.111-1.412-.957-2.651-2.405-2.792zm-.253 4.308c-.982 0-1.778-.773-1.778-1.728s.796-1.729 1.778-1.729c.981 0 1.777.774 1.777 1.729 0 .458-.187.898-.52 1.222a1.803 1.803 0 01-1.257.506z",
            binLid:     "M19.556-21.636h-1.334v.865h1.334a.438.438 0 00.444-.432.438.438 0 00-.444-.433zm-2.667 1.729a.439.439 0 00.444-.432v-.432H.444A.438.438 0 000-20.34c0 .239.199.432.444.432zm.444-2.16c0-.24-.199-.433-.444-.433H2.667c-.565 0-1.069.347-1.258.864h15.924z",
        }

        // 1. Setup SVG Canvas and layers
        const svg = d3.select(`#${settings.svgID}`).attr('viewBox', `0 0  ${settings.dims.width} ${settings.dims.height} `)
            .attr('xmlns', "http://www.w3.org/2000/svg" )
            .attr('xmlns:xlink', "http://www.w3.org/1999/xlink")

        const defs = svg.append('defs'),
            svgTitle = svg.append('title').attr('id', 'svg-title')
            svgDescription = svg.append('title').attr('id', 'svg-description')

        const recyclingInsert = {x: settings.dims.width * 0.35, y: settings.dims.height * 0.5},
            iconWidth = 20,  iconHeight = 22.5, iconBinHeight = 19.3, iconScale = 1.15

        // 2. Setup title and desc for screen reader accessibility
        const svgTitleText = `Bin waste composition diagram by material in ${settings.year})`,
            svgDescText = `A diagram showing the breakdown of waste materials materials (${data.schema.lists.materials.toString()}) and contamination.`

        svgTitle.html(svgTitleText)
        svgDescription.html(svgDescText)

        // Toggle title so that it doesn't appear as a default tooltip
        svg.on('mouseover', () => document.getElementById('svg-title').innerHTML = null )
            .on('mouseout', () =>  document.getElementById('svg-title').innerHTML = svgTitleText )

        // 3. Render Recycling breakdown "Bin breakdown graphic"
        const recycleBinScale = 15, chartBgRadius = 90,
            recyclingBreakdownChart = svg.append('g').classed('icon-chart', true).attr('id', 'recycling-breakdown-icon-chart')
                .attr('transform', `translate(${recyclingInsert.x}, ${recyclingInsert.y})`)

        let cumulativeProp = -iconBinHeight

        // a. Add Background bin body
        recyclingBreakdownChart.append('path')
            .attr('d', icons.binBody)
            .attr('transform', `translate(${0} , ${0})  scale(${recycleBinScale})`)
            .classed('bin-outline', true)

        // c. Add each material group
        binMonthData.forEach((materialData, i) => {
            const material = materialData[0],
                volume = materialData[1],
                materialSlug = helpers.slugify(material),
                materialProp = volume / d3.sum(binMonthData.map(d => d[1])),
                clipHeight =  materialProp * iconBinHeight
            
            // i. Add part of an icon with a clipath                
            defs.append('clipPath').attr('id', `recycle-bin-${materialSlug}`)
                .append('rect')
                .attr('x', 0)                            
                .attr('y', cumulativeProp)
                .attr('height', clipHeight)
                .attr('width', iconWidth)

            recyclingBreakdownChart.append('path')
                .classed(`recycling-breakdown ${materialSlug}`, true)
                .attr('d', icons.binBody)
                .attr('clip-path', `url(#recycle-bin-${materialSlug})`)
                .attr('transform', `translate(${0} , ${0}) scale(${recycleBinScale})`)

            // ii. Add label    
            recyclingBreakdownChart.append('text')
                .classed(`recycling-breakdown-material-label ${materialSlug}`, true) 
                .attr('transform',  `translate(${0} , ${(cumulativeProp + clipHeight /2) * recycleBinScale})` )
                .text(`${material}: ${helpers.numberFormatters.formatPct1dec(materialProp)}`) 

            cumulativeProp +=clipHeight     // Update cumulative position for label
        })
        // d. Add Bin wheel and lid
        recyclingBreakdownChart.append('path')
            .classed('bin', true)
            .attr('d', icons.binWheel)
            .attr('transform', `translate(${0} , ${0})  scale(${recycleBinScale})`)

        recyclingBreakdownChart.append('path')
            .attr('d', icons.binLid)
            .attr('transform', `translate(${0} , ${0})  scale(${recycleBinScale})`)
            .classed('recycling', true)
    };


    //////////////////
    //// HELPERS  //// 
    //////////////////

    const helpers= {
        numberFormatters: {
            formatComma:           	d3.format(",.0f"),
            formatComma1dec:       	d3.format(",.1f"),
            formatComma2dec:       	d3.format(",.2f"),
            formatInteger:         	d3.format(".0f"),   
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
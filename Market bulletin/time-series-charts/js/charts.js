///////////////////////////////////////////////////////////////////
/////  -----------------------------------------------------  /////
/////  SV MARKET BULLETIN - INTERACTIVE SERIES CHART LIBRARY  /////
/////  -----------------------------------------------------  /////
/////  Includes line, area and stacked area chart options     /////
/////  that require a configuration settings object to        /////
/////  be be passed in.                                       /////
/////                                                         /////
///////////////////////////////////////////////////////////////////


////////////////////////
///// CHART OBJECT  ////
////////////////////////

// General chart object used to store chart methods 
const chart = {
    data:               {},     // Used to store transformed data for charting
    schema:             {},     // Used to store schema extracted from data
    methods: {                  // User to store chart rendering and data preparation methods
        line:               {},
        seriesLayer:        {},
        seriesContext:      {},
        misc:           {}
    },
    byId:               {}
}

//////////////////////////////////
///// VISUALISATION METHODS   ////
//////////////////////////////////

// UPDATE QUERY STRING SETTINGS 
chart.methods.misc.applyQuerySettings = async (settings) => {
    // 1. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
    settings.queryParameters = new URLSearchParams(window.location.search)

    // 2. Update settings where provided in the query string 
    const dateArray = chart.data[settings.data.tableName].map(d => helpers.numberFormatters.formatMth_Year(d.date))
    settings.axis.x.end = settings.queryParameters.get('to') ? settings.queryParameters.get('to') :  dateArray[dateArray.length-1]
    settings.axis.x.start = settings.queryParameters.get('from') ? settings.queryParameters.get('from') 
        :  settings.queryParameters.get('to') ? dateArray[dateArray.indexOf(settings.queryParameters.get('to')) - settings.axis.x.defaultRange + 1]
            : dateArray[dateArray.length - settings.axis.x.defaultRange]
};


//  SERIES LINE AND AREA CHART WITH CONTEXT WINDOW
chart.methods.seriesContext.renderChart = async(settings) => {
    //------------------- 0. SETUP CHART TYPE, DIMENSIONS, REFERENCES AND DATA OBJECTS -------------------------//
        // a. Setup reference variables including the individual chart object (Ids are used for multi-chart pages)
        const chartType = settings.config.chartType,
            data = chart.data[settings.data.tableName],
            svgID = settings.svgID,
            svgContextID = settings.contextSvgID,
            chartObj = chart.byId[svgID] = {
                data:           {},
                labelFormat:    {},
                scales:         {
                    xFocus:         ''
                },
                state: {
                    date:       {}
                },
                list:           {}         
            }

        // b. Set Main SVG chart group dims
        const height = settings.dims.height,
            contextChartHeight = 100,
            chartWidth = settings.dims.width,
            margin = settings.dims.margin

        const svgMain = d3.select('#'+svgID)
            .classed(chartType+'-context-chart main interactive', true)
            .attr("viewBox", [0, 0, chartWidth, height])
            .attr('aria-labelledby',  'svgMainTitle svgMainDesc')

        const defs = svgMain.append('defs')

        const svgContext = d3.select('#'+svgContextID).classed('line-chart context interactive', true)
            .attr("viewBox", [0, 0, chartWidth, contextChartHeight])
            .attr('aria-labelledby',  'svgContextTitle svgContextDesc')

        // c. Add title and desc information for screen reader accessibility
        const svgMainTitle = `Time series ${settings.config.chartType} chart for ${settings.group} showing the series of: ${settings.series.toString()}, over the period from ${settings.axis.x.start} to ${settings.axis.x.end} is shown by default`,
            svgMainDescription =  `Time series ${settings.config.chartType} chart for ${settings.group} showing the series of: ${settings.series.toString()}. The period from ${settings.axis.x.start} to ${settings.axis.x.end} is shown by default, but can be changed by using the context chart window below. Volumes are are measured in ${settings.axis.y.label} ${settings.axis.x.unit}`,
            svgContextTitle =  `Time series context ${settings.config.chartType} chart for ${settings.group} showing the series of: ${settings.series.toString()}, from the beginning of the data time series to ${settings.axis.x.end}.`,
            svgContextDescription = `The time series context chart is a miniature version of the main chart showing the full timeline of data.  This chart has a 'window' that can be interacted with to change the time scale shown on the main chart (to zoom in or out).`

        svgMain.append('title').attr('id', 'svgMainTitle').html(svgMainTitle) 
        svgMain.append('desc').attr('id', 'svgMainDesc').html(svgMainDescription)
        svgContext.append('title').attr('id', 'svgContextTitle').html(svgContextTitle)           
        svgContext.append('desc').attr('id', 'svgContextDesc').html(svgContextDescription) 
        // Toggle title so that it doesn't appear as a default tooltip
        svgMain.on('mouseover', () => document.getElementById('svgMainTitle').innerHTML = null )
            .on('mouseout', () =>  document.getElementById('svgMainTitle').innerHTML = svgMainTitle )
        svgContext.on('mouseover', () => document.getElementById('svgContextTitle').innerHTML = null )
            .on('mouseout', () =>  document.getElementById('svgContextTitle').innerHTML = svgContextTitle )

        // d. Chart element layers
        const chartGroup = svgMain.append('g').classed('chart-group', true)
                .attr('role',  'figure').attr('tabindex', 0),
            xAxisGroup = chartGroup.append("g").classed('axis-group-x x-axis axis', true),
            yAxisGroup = chartGroup.append("g").classed('axis-group-y y-axis axis', true),
            areaGroup = chartGroup.append("g").classed("areas-group", true),
            lineGroup = chartGroup.append("g").classed("lines-group", true),
            dataPointGroup = chartGroup.append("g").classed("data-point-group", true),
            annotationGroup = chartGroup.append("g").classed("labels-group", true),
            listeningRect = chartGroup.append("rect").classed("listening-rect", true),
            tooltipGroup = chartGroup.append("g").classed("tooltip-group", true),
            svgContextChart = svgContext.append("g").classed('brush-group', true)
            brushGroup = svgContext.append("g").classed('brush-group', true)

        // e. Add main chart clip path
        defs.append("clipPath")
            .attr("id", `${svgID}-clipPath`)
            .append("rect")
                .attr("x", margin.left)
                .attr("y", 0)
                .attr("height", height)
                .attr("width", chartWidth - margin.left - margin.right);

        defs.append("clipPath")
            .attr("id", `${svgID}-clipPath-markers`)
            .append("rect")
                .attr("x", margin.left - settings.dims.markerRadius * 2.25)
                .attr("y", 0)
                .attr("height", height)
                .attr("width", chartWidth - margin.left - margin.right + settings.dims.markerRadius * 4.5 );


    //--------- 1. SETUP CHART OPTIONS AND SERIES DATA | OPTION FOR INTERACTIVE FEATURES ------------------//
        if(settings.config.interactive){
            // a. Extract and set series and scales
            chartObj.series  = [...new Set(Object.keys(data[0]).filter(d => d !== 'date').map(d => d.slice(0, d.indexOf('_'))))].sort() 
            chartObj.chartOptions  = [...new Set(Object.keys(data[0]).filter(d => d !== 'date').map(d => d.slice(d.indexOf('_') + 1)))].sort() 
            chartObj.seriesClass = chartObj.series.map(d => helpers.slugify(d))

            // b. Create grouped data object
            chartObj.chartOptions.forEach( group => {
                chartObj.data[group] = data.map(object => {
                    const obj = {date: object.date}
                    chartObj.series.forEach(seriesName => {
                        obj[seriesName] = object[`${seriesName}_${group}`]
                    })
                    return obj
                })
            })
        }

        // a. Set current state, (starting) chart data and selector
        chartObj.state.dataGroup = settings.group ? settings.group : selectGroup.node().value  
        chartObj.chartData = chartObj.data[chartObj.state.dataGroup]
        // b. Shape series data into series for rendering multiple series:
        chart.byId[svgID].seriesData = chartObj.chartData.map(d => { 
            const newObj = {}
            Object.entries(d).forEach(([key, value]) => {
                if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                    newObj[key] = value
                }
            })
            return newObj
        })

        chart.byId[svgID].series = settings.series.map(seriesName => {
            return {
                [seriesName]: chart.byId[svgID].seriesData.map(d => { 
                    return {
                        date:       d.date, 
                        value:      d[seriesName] 
                    } 
                })
            }
        })
        
    // c. Series stacked data
    chart.byId[svgID].stackedData = d3.stack().keys(settings.series)(chart.byId[svgID].seriesData)

    // d. Extract date list (used for drop down selectors)
    chartObj.list.date = data.map(d => d.date)
    chartObj.list.month = data.map(d => helpers.numberFormatters.formatMth_Year(d.date))


    //----------------------------- 2. SET UP SCALES AND AXES -----------------------------//

    // a. Setup scales
    const sum = (r, a) => r.map((b, i) => a[i] + b)         // Helper for zip
    const yDataSeries = chart.byId[svgID].series.map(d => Object.values(d)[0]).map(arr => arr.map(d => d.value))
    chartObj.scales.yMaxAll = chartType !== 'layer' ? d3.max(yDataSeries.map(d=> d3.max(d))) :  d3.max(yDataSeries.reduce(sum))

    const x = d3.scaleTime()
        .domain(d3.extent(chartObj.list.date))
        .range([margin.left, chartWidth - margin.right])

    const y = d3.scaleLinear()
        .domain([0, chartObj.scales.yMaxAll])
        .range([height - margin.bottom, margin.top])

    chartObj.scales.xFocus = x

    // b. Setup axes
    const xAxis = (g, x, height) => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x)
            .ticks(12)
            .tickSize(-height + settings.dims.margin.top + settings.dims.margin.bottom )
            .tickSize(4 )
            .tickSizeOuter(4)
        )

    const yAxis = (g, y, title) => g
        .attr("transform", `translate(${margin.left - 10},0)`)
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth + settings.dims.margin.left + settings.dims.margin.right)
            .ticks(6)
        )
        .call(g => g.select(".domain").remove())

    // c. Setup brush for context chart
    const brush = d3.brushX()
        .extent([[margin.left, 0.5],  [chartWidth - margin.right, contextChartHeight - margin.bottom + 0.5]  ])
        .on("brush", brushed)
        .on("end", brushended)       

    // d. Set axes label formatting
    switch(settings.scales.y.unit){
        case 'number':
            chartObj.labelFormat.yFormat = d3.format(",.0f")	
            break
        case 'price':
            chartObj.labelFormat.yFormat = d3.format("$.1f")
            break
        default:
            chartObj.labelFormat.yFormat = d3.format(",.0f")	
    }
    switch(settings.scales.x.unit){
        case 'date':
            chartObj.labelFormat.xFormat = d3.timeFormat('%b %Y')
            break
        default:
            chartObj.labelFormat.xFormat = d3.timeFormat('%b %Y')
    }

    // e. Data collection helper
    const startDataIndex = chartObj.list.month.indexOf(settings.axis.x.start),
        endDataIndex = chartObj.list.month.indexOf( settings.axis.x.end),
        noMonths = endDataIndex - startDataIndex + 1

    const getDatumObj =  (d, index) => {
        const data = chart.byId[svgID].series[index]
        return {
            id:             Object.keys(data)[0],
            startData:      Object.values(data)[0][chartObj.state.startDataIndex],
            endData:        Object.values(data)[0][chartObj.state.endDataIndex],
            lastYrData:     Object.values(data)[0][chartObj.state.endDataIndex - 11],
            lastMthData:    Object.values(data)[0][chartObj.state.endDataIndex - 1]
        }
    }

    chartObj.state.monthTotal = d3.sum(chart.byId[svgID].series.map(d => Object.values(d)[0][endDataIndex]).map(d => d.value))
        

    //------------ 3. ACCESSORS, SHAPE GENERATOR AND RENDERING OF LINES & AXES -------------------//
        // a. Shape generators
        const line = (x, y) => d3.line()
            .curve(d3.curveMonotoneX) 
            .defined(d => !isNaN(d.value))
            .x(d => x(d.date))
            .y(d => y(d.value))

        const area = (x, y) => d3.area()
            .curve(d3.curveMonotoneX) 
            .defined(d => !isNaN(d.value))
            .x(d => x(d.date))
            .y0(y(0))
            .y1( d => y(d.value) )

        const stackedArea = (x, y)=>  d3.area()
            .curve(d3.curveMonotoneX) 
            .x( d => x(d.data.date))
            .y0( d => y(d[0]))
            .y1( d => y(d[1])) 


        // b. MAIN CHART: add main chart data elements (without path attribute)
        switch(chartType){
            case 'line':
            case 'area':
                chart.byId[svgID].series.forEach( obj => {
                    const seriesName = Object.keys(obj)[0], seriesData = Object.values(obj)[0]

                    areaGroup.append("path")
                        .attr('id', `${helpers.slugify(seriesName)}-area`)
                        .classed(`area main ${helpers.slugify(seriesName)}`, true)
                        .datum(seriesData)
                        .attr("clip-path", `url(#${svgID}-clipPath)`)  
                        .style('opacity', chartType === 'line' ?  0 : null)

                    lineGroup.append("path")
                        .attr('id', `${helpers.slugify(seriesName)}-main-line`)
                        .classed(`line main ${helpers.slugify(seriesName)}`, true)
                        .datum(seriesData)
                        .attr("clip-path", `url(#${svgID}-clipPath)`)        
                })

                // MAIN CHART: add data point circles
                chart.byId[svgID].series.forEach( obj => {
                    const seriesName = Object.keys(obj)[0], seriesData = Object.values(obj)[0]
                    dataPointGroup
                        .attr("clip-path", `url(#${svgID}-clipPath-markers)`)    
                        .attr('tabindex', 0)
                        .attr('role', 'list')
                        .attr('aria-label', 'dots')
                        .selectAll(`.data-point.${helpers.slugify(seriesName)}`)
                        .data(seriesData)
                        .join("circle")
                            .classed(`data-point main ${helpers.slugify(seriesName)}`, true)
                            .attr('tabindex', 0)
                            .attr('role', 'listitem')
                            .attr('aria-label', 'data description')
                })

                // CONTEXT CHART: add lines and area for each series
                chart.byId[svgID].series.forEach( obj => {
                    const seriesName = Object.keys(obj)[0],   seriesData = Object.values(obj)[0]
                    svgContextChart.append("path")
                        .attr('id', `${helpers.slugify(seriesName)}-context-area`)
                        .classed(`area context ${helpers.slugify(seriesName)}`, true)
                        .datum(seriesData)
                            .attr("clip-path", `url(#${svgID}-clipPath)`)  
                            .style('opacity', chartType === 'line' ?  0 : null)
                        .attr("d", area(x, y.copy().range([contextChartHeight - margin.bottom, 4])) ); 

                    svgContextChart.append("path")
                        .attr('id', `${helpers.slugify(seriesName)}-context-line`)
                        .classed(`${helpers.slugify(seriesName)} line context`, true)
                        .datum(seriesData)
                        .attr("d", line(x, y.copy().range([contextChartHeight - margin.bottom, 4])) ); 
                })
                break

            case 'layer':
                // MAIN CHART: add main chart lines and areas (without path attribute)
                areaGroup.selectAll(`#${svgID} .layer`)
                    .data(chart.byId[svgID].stackedData)
                    .join("path")
                        .attr("clip-path", `url(#${svgID}-clipPath)`)  
                        .attr("class", (d, i) => `${helpers.slugify(settings.series[i])} layer main`)
                        .attr("d", stackedArea(x, y))
                // CONTEXT CHART: add layers and area for each series
                svgContextChart.selectAll('.layer.context')
                    .data(chart.byId[svgID].stackedData)
                    .join("path")
                        .attr("class", (d, i) => `${helpers.slugify(settings.series[i])} layer context`)
                        .attr("d", stackedArea(x, y.copy().range([contextChartHeight - margin.bottom, 4])) ); 
                break

            default:
                console.log('No valid chart type')
        }

        // c. CONTEXT CHART: add x-axis amd setup brush for starting date range (inl. setting state)
        svgContext.append("g").classed('x-axis axis context', true)
            .call(xAxis, x, contextChartHeight)

        const defaultTimeSelection = [
            x(helpers.numberParsers.parseMonthYear(settings.axis.x.start)), 
            x(helpers.numberParsers.parseMonthYear(settings.axis.x.end)), 
        ]

        brushGroup.call(brush)
            .call(brush.move, defaultTimeSelection);

        chartObj.state.date.from = settings.axis.x.start
        chartObj.state.date.to = settings.axis.x.end


    //---------------------------- 4. SERIES AND AXES LABELS -----------------------------//

        // a. Axes labels
        const yLabel = annotationGroup.append("g")
            .attr("class", "axis-label y-axis")
            .attr("transform", `translate(${10}, ${margin.top + height * 0.5 - margin.bottom}) rotate(-90)`)
        yLabel.append("text").classed('axis-label y', true)
            .attr("dy", ".75em")
            .text(`${settings.axis.y.label} ${settings.axis.x.unit}`)

        const xLabel = annotationGroup.append("g")
            .attr("class", "axis-label x-axis")
            .attr("transform", `translate(${chartWidth}, ${height})`)
        xLabel.append("text").classed('axis-label x', true)
            .attr("dy", "50")
            .text(settings.axis.x.label)

        // b. Series labels and annotation
        switch(chartType){
            case 'line':
            case 'area':
            // i. Series labels
            annotationGroup.selectAll(".series-label")
                .data(chart.byId[svgID].series)
                .join('text')
                    .attr("class", d => helpers.slugify(Object.keys(d)[0])+" series-label")
                    .datum((d, i) => getDatumObj(d, i))
                    .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y})` )
                    .text( d => `${d.id}: ${chartObj.labelFormat.yFormat(d.endData.value)} ${settings.axis.y.unit}`)
                        .on('mouseover', chartType === 'line' ? labelMouseover : null)
                        .on('mouseout',  chartType === 'line' ? labelMouseout : null)

            // oo. Series performance labels
            annotationGroup.selectAll(".series-performance-label-month")
                .data(chart.byId[svgID].series)
                .join('text')
                    .datum((d, i) => getDatumObj(d, i))
                    .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y + 16})` )
                    .attr("class", d => `${helpers.slugify(d.id)} series-performance-label-month series-performance-label series-sublabel blur`)
                    .text(d => d.lastMthData.value  === 0 ? '' : `${d.lastMthData.value > d.endData.value ? '-' : '+'}${helpers.numberFormatters.formatPct1dec(Math.abs(d.endData.value / d.lastMthData.value - 1))} vs last month` )

            annotationGroup.selectAll(".series-performance-label-year")
                .data(chart.byId[svgID].series)
                .join('text')
                    .datum((d, i) => getDatumObj(d, i))
                    .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y + 28})` )
                    .attr("class", d => `${helpers.slugify(d.id)} series-performance-label-year series-performance-label series-sublabel blur`)
                    .text(d =>  d.lastYrData.value  === 0 ? '' : `${d.lastYrData.value > d.endData.value ? '-' : '+'}${helpers.numberFormatters.formatPct1dec(Math.abs(d.endData.value / d.lastYrData.value - 1))} in the last 12 months `)

            annotationGroup.selectAll(".series-performance-label-range")
                .data(chart.byId[svgID].series)
                .join('text')
                    .datum((d, i) => getDatumObj(d, i))
                    .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y + 40})` )
                    .attr("class", d => `${helpers.slugify(d.id)} series-performance-label-range series-performance-label series-sublabel blur`)
                    .text(d => d.startData.value  === 0 ? '' : `${d.startData.value > d.endData.value ? '-' : '+'}${helpers.numberFormatters.formatPct1dec(Math.abs(d.endData.value / d.startData.value - 1))} since ${helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.start))}`)

            // iii. Misc data labels
            // Month with total label
            annotationGroup.append('rect')
                .attr('x', chartWidth - settings.dims.margin.right + settings.labelOffset.x)
                .attr('y', settings.dims.margin.top)
                .attr('width', settings.dims.margin.right )
                .attr('height', 50)
                .style('fill', '#fff')
                .style('opacity', 1)

            // Latest month label
            annotationGroup.append('text').attr('id', 'chart-volume-sub-label')
                .classed('annotation-sub-label-main chart-date-label', true)
                .attr('x', chartWidth - settings.dims.margin.right + settings.labelOffset.x)
                .attr('y', settings.dims.margin.top)
                .text(chartType === 'line' ? `Volumes by destination in` : `Estimated stored volume in`) 

            annotationGroup.append('text').attr('id', 'chart-end-date-label')
                .classed('annotation-label-main uppercase chart-date-label', true)
                .attr('x', chartWidth - settings.dims.margin.right + settings.labelOffset.x)
                .attr('y', settings.dims.margin.top + 26)
                .text(`${helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end))}`) 

            // Latest Month total 
            annotationGroup.append('text').attr('id', 'chart-total-sub-label')
                .classed('annotation-sub-label-main chart-month-total-label', true)
                .attr('x', chartWidth - settings.dims.margin.right + settings.labelOffset.x)
                .attr('y', height - settings.dims.margin.bottom + 20)
                .text(`Total volume in ${helpers.numberFormatters.formatMthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end))}`) 

            annotationGroup.append('text').attr('id', 'chart-total-volume')
                .classed('annotation-label-main chart-month-total-label', true)
                .attr('x', chartWidth - settings.dims.margin.right + settings.labelOffset.x)
                .attr('y', height - settings.dims.margin.bottom + 44)
                .text(`${helpers.numberFormatters.formatComma(chartObj.state.monthTotal)} tonnes`) 

            // Cumulative series total label
            annotationGroup.append('text').attr('id', 'chart-cumulative-date')
                .classed('annotation-sub-label-main centered chart-cumulative-label', true)
                .attr('x', chartWidth/2 - settings.dims.margin.left)
                .attr('y', height - settings.dims.margin.bottom - 54)

            annotationGroup.append('text').attr('id', 'chart-cumulative-total')
                .classed('annotation-label-main centered chart-cumulative-label', true)
                .attr('x', chartWidth/2 - settings.dims.margin.left)
                .attr('y', height - settings.dims.margin.bottom - 26)

                break
            default: 
        }



    //---------------------------- 5. CHART TOOLTIPS -----------------------------//

    // a. Setup chart slicer tooltip wih a transparent listening window/rect over chart
    listeningRect.classed('chart-mouse-listener', true)
        .attr('width', chartWidth - settings.dims.margin.left - settings.dims.margin.right)
        .attr('height', height - settings.dims.margin.top - settings.dims.margin.bottom)
        .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)
            .on('mousemove', showChartTooltip)
            .on('mouseleave', hideChartTooltip)

    let totalLineWidth = margin.right, totalLineWidthSet = false   // Variables to set totals divider line once

    // b. Prepare tooltip elements ()
        // Tooltip background (beneath text to improve legibility when tooltip covers part of the data)
        tooltipGroup.append('rect').attr('id', `${svgID}-tooltip-bg`)
            .classed('tooltip-element tooltip-bg', true)
            .attr('y', `${settings.dims.margin.top} `) 

        // Slicer line
        tooltipGroup.append('path').attr('id',`${svgID}-tooltip-slicer`)
            .classed('tooltip-slicer tooltip-element', true)
        const tooltipElements = tooltipGroup.append('g').attr('id', `${svgID}-tooltip-element-group`),
            tooltipElementLabels = tooltipElements.append('g'),
            tooltipElementValues = tooltipElements.append('g')

        // Slicer month label
        tooltipElements.append('text').attr('id',`${svgID}-tooltip-slicer-month-label`)
            .classed('tooltip-slicer-header tooltip-element', true)  

        // Slicer series data circle and label
        Object.entries(chartObj.series).forEach( ([index, obj]) => {
            const seriesName = Object.keys(obj)[0], values = Object.values(obj)[0]
            // Tooltip dots
            tooltipElementLabels.append('circle')
                .attr('id',`${svgID}-${helpers.slugify(seriesName)}-tooltip-circle`)
                .classed(`${helpers.slugify(seriesName)} tooltip-slicer-circle tooltip-element`, true)
                .attr('r', 5)
            // Series labels
            tooltipElementLabels.append('text')
                .attr('id',`${svgID}-${helpers.slugify(seriesName)}-tooltip-series-label`)
                .classed(`${helpers.slugify(seriesName)} tooltip-slicer-label tooltip-element`, true)
            // Series values
            tooltipElementValues.append('text')
                .attr('id',`${svgID}-${helpers.slugify(seriesName)}-tooltip-values-label`)
                .classed(`${helpers.slugify(seriesName)} tooltip-slicer-label value tooltip-element`, true)
        })

        // Slicer total data   
        if(chartObj.series.length > 1){    
            const totalYpos = settings.dims.margin.top + 28 + 17 * (chartObj.series.length)
            tooltipGroup.append('path')
                .attr('id',`${svgID}-total-tooltip-series-divider`)
                .classed(`tooltip-slicer-divider tooltip-element`, true)
            tooltipElementLabels.append('text')
                .attr('id',`${svgID}-total-tooltip-series-label`)
                .classed(`tooltip-slicer-label total tooltip-element`, true)
                .attr('y', totalYpos + 5) 
                .text(`Total`) 
            tooltipElementValues.append('text')
                .attr('id',`${svgID}-total-tooltip-value-label`)
                .classed(`tooltip-slicer-label total value tooltip-element`, true)
                .attr('y', totalYpos + 5) 
        }

        // Set visibility of tooltip elements on load
        hideChartTooltip()


    //---------------------------- 6. ACCESSIBILITY ENHANCEMENTS -----------------------------//
        d3.selectAll(`#${settings.svgID} text`)
            .attr('role', 'presentation')
            .attr('aria-hidden', true)

    //---------------------------- 7. CHART INTERACTION METHODS -----------------------------//

    // Chart tooltip (slicer)
    function showChartTooltip(ev){
        const mousePosition = d3.pointer(ev),
            hoveredDate = chartObj.scales.xFocus.invert(mousePosition[0] + settings.dims.margin.left),
            dataset = chartObj.list.date.map(d => chartObj.scales.xFocus(d) - settings.dims.margin.left),
            getDistanceFromHoveredDate = d =>  Math.abs( d - mousePosition[0] ),
            closestIndex = d3.leastIndex(dataset, (a,b) => (getDistanceFromHoveredDate(a) - getDistanceFromHoveredDate(b) )),
            closestDataPoint = chartObj.list.date[closestIndex],
            monthTotal = d3.sum(chart.byId[svgID].series.map(d => Object.values(d)[0][closestIndex]).map(d => d.value)),
            totalYpos = settings.dims.margin.top + 28 + 17 * (chartObj.series.length),
            // Sorting to sort the order of the series shown in the tooltip
            unsortedSeriesData = chartObj.series.map(d => {                   
                return { [Object.keys(d)[0]]: Object.values(d)[0][closestIndex].value }
            }),
            // Separate "All other countries"
            unsortedSeriesName = unsortedSeriesData.map(d => Object.keys(d)[0]),
            allOtherIndex = unsortedSeriesName.indexOf('All other countries'),
            allOtherObj = unsortedSeriesData[allOtherIndex],
            unsortedSeriesDataExOther = unsortedSeriesData.filter( (d,i) => i !== allOtherIndex),
            sortedSeriesData = (allOtherIndex > 0) ? unsortedSeriesDataExOther.map(d => d).sort((a, b) => Object.values(b)[0] - Object.values(a)[0])
                : unsortedSeriesData.sort((a, b) => Object.values(b)[0] - Object.values(a)[0])
            // Add back all other countries
            if(allOtherIndex > 0) {sortedSeriesData.push(allOtherObj)}
            
        // Show all tooltip elements and draw: slicer line and month label
        d3.selectAll('.tooltip-element').classed('hidden', false)
        d3.select(`#${svgID}-tooltip-slicer`)
            .attr('d', `M${chartObj.scales.xFocus(closestDataPoint)}, ${y(0)} v${-(height - settings.dims.margin.top - settings.dims.margin.bottom)}`)
        d3.select(`#${svgID}-tooltip-bg`)
            .attr('x', `${chartObj.scales.xFocus(closestDataPoint) + 2.5} `) 
        d3.select(`#${svgID}-tooltip-slicer-month-label`)                
            .attr('x', `${chartObj.scales.xFocus(closestDataPoint) + 5} `) 
            .attr('y', `${settings.dims.margin.top + 3} `) 
            .text(helpers.numberFormatters.formatMonthYear(closestDataPoint))

        // Update and highlight slicer data points by increasing size: first reset all dots then loop through each series to update
        d3.selectAll('.data-point')
            .attr('r', chartObj.state.dataPointRadius)
            .attr('stroke-width', chartObj.state.dataPointStrokeWidth)

        // For each series
        Object.entries(chartObj.series).forEach( ([index, obj]) => {
            const seriesName = Object.keys(obj)[0], values = Object.values(obj)[0],
                seriesRank = sortedSeriesData.map(d => Object.keys(d)[0]).indexOf(seriesName)
            // Update tooltip dots
            d3.selectAll(`.${helpers.slugify(seriesName)}.tooltip-slicer-circle`)
                .attr('cx', `${chartObj.scales.xFocus(closestDataPoint) + 10}`) 
                .attr('cy', `${settings.dims.margin.top + 32 + 17 * seriesRank}`) 
            // Update series labels
            d3.select(`#${svgID}-${helpers.slugify(seriesName)}-tooltip-series-label`)
                .attr('x', `${chartObj.scales.xFocus(closestDataPoint) + 20} `) 
                .attr('y', `${settings.dims.margin.top + 28 + 17 * seriesRank}`) 
                .text(`${seriesName}`)
            // Update value labels
            d3.select(`#${svgID}-${helpers.slugify(seriesName)}-tooltip-values-label`)
                .attr('x', `${chartObj.scales.xFocus(closestDataPoint)} `) 
                .attr('y', `${settings.dims.margin.top + 28 + 17 * seriesRank}`) 
                .text(`${helpers.numberFormatters.formatComma(values[closestIndex].value)} tonnes`)
            // Make dots bigger
            const selection = document.querySelectorAll(`.data-point.${helpers.slugify(seriesName)}`)
            d3.select(selection[closestIndex]).attr('r', chartObj.state.dataPointRadius * 2)
        })

        // Update the total underline if there are more than one series shown
        if(chartObj.series.length > 1){  
            // Set a total line width (rather than recalc on mouse movement)
            if(!totalLineWidthSet || tooltipElements.node().getBBox().width < totalLineWidth){
                totalLineWidth  = tooltipElements.node().getBBox().width
                totalLineWidthSet = true
            }
            // Setup the tooltip
            d3.select(`#${svgID}-total-tooltip-series-divider`)     
                .attr('d', `M${chartObj.scales.xFocus(closestDataPoint) + 20}, ${totalYpos - 2} h${totalLineWidth - 10}`)
            d3.select(`#${svgID}-total-tooltip-series-label`)
                .attr('x', `${chartObj.scales.xFocus(closestDataPoint) + 20}`) 
            d3.select(`#${svgID}-total-tooltip-value-label`)
                .attr('x', `${chartObj.scales.xFocus(closestDataPoint)}`) 
                .text(`${helpers.numberFormatters.formatComma(monthTotal)} tonnes`) 
        }
        // Set position of values group (offset from BBox of labels)
        tooltipElementValues.attr('transform', `translate(${tooltipElementLabels.node().getBBox().width + tooltipElementValues.node().getBBox().width + 20}, 0)`)

        // Set the size of the tooltip background rect
        d3.select(`#${svgID}-tooltip-bg`)
            .attr('width', tooltipElements.node().getBBox().width + 10)
            .attr('height', tooltipElements.node().getBBox().height + 5)

        // Hide data summary for latest month (right side of chart) while showing tooltip
        d3.selectAll(`.chart-date-label, .chart-month-total-label, .series-label`)
            .classed('blur', true)
    };

    function hideChartTooltip(){
        switch(chartType){
            case 'line':
            case 'area':
                // Revert to default view
                d3.select(`#${svgID}-tooltip-slicer`).attr('d', null)
                d3.selectAll(`.chart-date-label, .chart-month-total-label, .series-label`).classed('blur', false)
                d3.selectAll('.tooltip-element').classed('hidden', true)
                d3.selectAll('.data-point')
                    .attr('r', chartObj.state.dataPointRadius)
                    .attr('stroke-width', chartObj.state.dataPointStrokeWidth)
                break

            case 'layer':
                const endIndex = chart.byId[svgID].state.endDataIndex
                    dataPoint = chartObj.list.date[endIndex],
                    monthTotal = d3.sum(chart.byId[svgID].series.map(d => Object.values(d)[0][endIndex]).map(d => d.value)),
                    sortedSeriesData = chartObj.series.map(d => {                   // Sorting to sort the order of the series shown in the tooltip
                            return { [Object.keys(d)[0]]: Object.values(d)[0][endIndex].value }
                        }).sort((a, b) => Object.values(b)[0] - Object.values(a)[0] ),
                    sortedSeriesName = sortedSeriesData.map(d => Object.keys(d)[0]),
                    totalYpos = settings.dims.margin.top + 28 + 17 * (chartObj.series.length)

                // Draw slicer 
                d3.selectAll('.tooltip-element').classed('hidden', false)
                d3.select(`#${svgID}-tooltip-slicer`)
                    .attr('d', `M${chartObj.scales.xFocus(dataPoint)}, ${y(0)} v${-(height - settings.dims.margin.top - settings.dims.margin.bottom)}`)
                // Tooltip month
                d3.select(`#${svgID}-tooltip-bg`)
                    .attr('x', `${chartObj.scales.xFocus(dataPoint) + 2.5} `) 
                d3.select(`#${svgID}-tooltip-slicer-month-label`)                
                    .attr('x', `${chartObj.scales.xFocus(dataPoint) + 5} `) 
                    .attr('y', `${settings.dims.margin.top} `) 
                    .text(helpers.numberFormatters.formatMonthYear(dataPoint))

                // Show all tooltip elements and draw: slicer line and month label
                d3.selectAll('.tooltip-element').classed('hidden', false)
                d3.select(`#${svgID}-tooltip-slicer`)
                    .attr('d', `M${chartObj.scales.xFocus(dataPoint)}, ${y(0)} v${-(height - settings.dims.margin.top - settings.dims.margin.bottom)}`)
                d3.select(`#${svgID}-tooltip-bg`)
                    .attr('x', `${chartObj.scales.xFocus(dataPoint) + 2.5} `) 
                d3.select(`#${svgID}-tooltip-slicer-month-label`)                
                    .attr('x', `${chartObj.scales.xFocus(dataPoint) + 5} `) 
                    .attr('y', `${settings.dims.margin.top + 3} `) 
                    .text(helpers.numberFormatters.formatMonthYear(dataPoint))

                // For each series
                Object.entries(chartObj.series).forEach( ([index, obj]) => {
                    const seriesName = Object.keys(obj)[0], values = Object.values(obj)[0],
                        seriesRank = sortedSeriesName.indexOf(seriesName)
                    // Update tooltip dots
                    d3.selectAll(`.${helpers.slugify(seriesName)}.tooltip-slicer-circle`)
                        .attr('cx', `${chartObj.scales.xFocus(dataPoint) + 10}`) 
                        .attr('cy', `${settings.dims.margin.top + 32 + 17 * seriesRank}`) 
                    // Update series labels
                    d3.select(`#${svgID}-${helpers.slugify(seriesName)}-tooltip-series-label`)
                        .attr('x', `${chartObj.scales.xFocus(dataPoint) + 20} `) 
                        .attr('y', `${settings.dims.margin.top + 28 + 17 * seriesRank}`) 
                        .text(`${seriesName}`)
                    // Update value labels
                    d3.select(`#${svgID}-${helpers.slugify(seriesName)}-tooltip-values-label`)
                        .attr('x', `${chartObj.scales.xFocus(dataPoint)} `) 
                        .attr('y', `${settings.dims.margin.top + 28 + 17 * seriesRank}`) 
                        .text(`${helpers.numberFormatters.formatComma(values[endIndex].value)} tonnes`)
                })

                // Update the total line if there are more than one series shown
                if(chartObj.series.length > 1){    
                    d3.select(`#${svgID}-total-tooltip-series-divider`)     
                        .attr('d', `M${chartObj.scales.xFocus(dataPoint) + 20}, ${totalYpos - 2} h${tooltipElements.node().getBBox().width - 10}`)
                    d3.select(`#${svgID}-total-tooltip-series-label`)
                        .attr('x', `${chartObj.scales.xFocus(dataPoint) + 20} `) 
                    d3.select(`#${svgID}-total-tooltip-value-label`)
                        .attr('x', `${chartObj.scales.xFocus(dataPoint)} `) 
                        .text(`${helpers.numberFormatters.formatComma(monthTotal)} tonnes`) 
                }
                // Set position of values group (offset from BBox of labels)
                tooltipElementValues.attr('transform', `translate(${tooltipElementLabels.node().getBBox().width + tooltipElementValues.node().getBBox().width + 20}, 0)`)

                // Set the size of the tooltip background rect
                d3.select(`#${svgID}-tooltip-bg`)
                    .attr('width', tooltipElements.node().getBBox().width + 10)
                    .attr('height', tooltipElements.node().getBBox().height + 5)

                break

            default:

        }
    };

    // CHART SERIES LABEL INTERACTIONS
    function labelMouseover(event, d){
        const selection = d3.select(this),
            svgID = settings.svgID,
            chartObj = chart.byId[svgID],
            otherSeries = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.classList[0]).map(d => '.'+d),
            xLabel = chartObj.labelFormat.xFormat(chart.byId[svgID].seriesData[+this.getAttribute('index')].date),
            classIndex = chart.byId[svgID].series.map(d => Object.keys(d)[0]).map(d=> helpers.slugify(d)).indexOf(this.classList[0]),
            seriesData = chart.byId[svgID].series.map(d => Object.values(d)[0])[[classIndex]].slice(chartObj.state.startDataIndex , chartObj.state.endDataIndex + 1)

        // Highlight the series visually 
        d3.selectAll(`.chart-date-label, .chart-month-total-label, ${otherSeries.toString()}`)
            .classed('blur', true)
        d3.selectAll(`.series-performance-label.${this.classList[0]}`)
            .classed('blur', false)
        d3.selectAll(`.area.${this.classList[0]}`)
            .style('opacity', null)
        // Show series trend info
        d3.select('#chart-cumulative-date')
            .text(`Total volume from 
                ${helpers.numberFormatters.formatMthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.start)) } 
                to ${helpers.numberFormatters.formatMthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end)) } 
            `) 
        d3.select('#chart-cumulative-total')
            .text(`${helpers.numberFormatters.formatComma(d3.sum(seriesData.map(d => d.value)) )} tonnes`) 
    }; // end labelMouseover

    function labelMouseout(event, d){
        const selection = d3.select(this),
            svgID = settings.svgID,
            seriesClassSelector = settings.series.map(d => '.'+helpers.slugify(d)).toString(),
            chartObj = chart.byId[svgID]
        selection.transition().delay(20).duration(200)
            .attr("r", d=> +this.getAttribute('index') < chart.byId[svgID].seriesData.length - 1 ? 2 : 5)
            .style("opacity", null);

        d3.selectAll(`${seriesClassSelector}, .chart-date-label, .chart-month-total-label `).classed('blur', false)
        d3.selectAll(`.series-performance-label`).classed('blur', true)
        d3.selectAll(`.area`).style('opacity', 0)

        // Reset labels
        d3.select('#chart-total-sub-label')
            .text(`Total volume in ${helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end))}`) 
        d3.select('#chart-total-volume')
            .text(`${helpers.numberFormatters.formatComma(chartObj.state.monthTotal)} tonnes`) 
        d3.selectAll('#chart-cumulative-date, #chart-cumulative-total')
            .text('') 

    }; // end circleMouseover


    // CONTEXT CHART BRUSH INTERACTIONS
    function brushed({selection}) {
        if (selection) {
            const dateExtent = [x.invert(selection[0]), x.invert(selection[1])]
            svgContext.property("value", selection.map(x.invert, x).map(d3.utcDay.round));
            svgContext.dispatch("input");
            brushUpdateAxis(svgContext.property("value"))
        }
    }; 

    function brushended({selection}) {
        if (!selection) {
            brushGroup.call(brush.move, defaultTimeSelection);
        }
    }; 

    function brushUpdateAxis(xExtent){
        const [minX, maxX] = xExtent
        updateMainChart(x.copy().domain(xExtent), y.copy().domain([0, chartObj.scales.yMaxAll]));
    };

    function updateMainChart(focusX, focusY) {
        // Update date range and axis
        chartObj.scales.xFocus = focusX
        settings.axis.x.start = helpers.numberFormatters.formatMth_Year(svgContext.property("value")[0])
        settings.axis.x.end = helpers.numberFormatters.formatMth_Year(svgContext.property("value")[1])

        const startDataIndex = chartObj.list.month.indexOf(settings.axis.x.start),
            endDataIndex = chartObj.list.month.indexOf( settings.axis.x.end),
            noMonths = endDataIndex - startDataIndex + 1

        chartObj.state.startDataIndex = chartObj.list.month.indexOf(settings.axis.x.start)
        chartObj.state.endDataIndex = chartObj.list.month.indexOf( settings.axis.x.end)
        chartObj.state.monthTotal = d3.sum(chart.byId[svgID].series.map(d => Object.values(d)[0][endDataIndex]).map(d => d.value))
        chartObj.state.dataPointRadius =  d3.min([settings.dims.markerRadius, d3.max([settings.dims.markerRadius * 12 / noMonths , 1.5]) ])
        chartObj.state.dataPointStrokeWidth =  d3.min([1, d3.max([2 * 12 / noMonths , 2])] )

        // Call axis
        xAxisGroup.call(xAxis, focusX, height);
        yAxisGroup.call(yAxis, focusY);

        // Update layer chart 
        d3.selectAll('.layer.main')
            .attr("d", stackedArea(focusX, focusY))

        // Update area chart 
        d3.selectAll('.area.main')
            .attr("d",area(focusX, focusY))

        // Update line chart
        d3.selectAll('.line.main')
            .style('stroke-width', d3.min([settings.dims.strokeWidth, d3.max([settings.dims.strokeWidth * 12 / noMonths, 1]) ]) )
            .attr("d",line(focusX, focusY))

        // Update line chart data points
        dataPointGroup.selectAll(`.data-point`)
            .attr('cx', d => focusX(d.date))
            .attr('cy', d => focusY(d.value))
            .attr('r', chartObj.state.dataPointRadius )
            .attr('stroke-width', chartObj.state.dataPointStrokeWidth)

        // Update line chart series labels
        d3.selectAll("text.series-label")
            .datum((d, i) => getDatumObj(d, i))
            .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y})`)
            .text( d => `${d.id}: ${chartObj.labelFormat.yFormat(d.endData.value)} ${settings.axis.y.unit}`)

        d3.selectAll(".series-performance-label-month")
            .datum((d, i) => getDatumObj(d, i))
            .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y + 16})` )
            .text(d => d.lastMthData.value  === 0 ? '' : `${d.lastMthData.value > d.endData.value ? '-' : '+'}${helpers.numberFormatters.formatPct1dec(Math.abs(d.endData.value / d.lastMthData.value - 1))} vs last month` )

        d3.selectAll(".series-performance-label-year")
            .datum((d, i) => getDatumObj(d, i))
            .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y + 28})` )
            .text(d =>  d.lastYrData.value  === 0 ? '' : `${d.lastYrData.value > d.endData.value ? '-' : '+'}${helpers.numberFormatters.formatPct1dec(Math.abs(d.endData.value / d.lastYrData.value - 1))} in the last 12 months `)

        d3.selectAll(".series-performance-label-range")
            .datum((d, i) => getDatumObj(d, i))
            .attr("transform", (d, i) => `translate(${settings.dims.width - settings.dims.margin.right + settings.labelOffset.x} ,  ${y(d.endData.value) + settings.labelOffset.y + 40})` )
            .text(d => d.startData.value  === 0 ? '' : `${d.startData.value > d.endData.value ? '-' : '+'}${helpers.numberFormatters.formatPct1dec(Math.abs(d.endData.value / d.startData.value - 1))} since ${helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.start))}`)

        // Update chart annotations
        d3.select('#fromDate-subheader')
            .html(helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.start)))
        d3.select('#toDate-subheader')
            .html(helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end)))
        d3.select('#chart-end-date-label')
            .text(`${helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end))}`) 
        d3.select('#chart-total-sub-label')
            .text(`Total volume in ${helpers.numberFormatters.formatMonthYear(helpers.numberParsers.parseMonthYear(settings.axis.x.end))}`) 
        d3.select('#chart-total-volume')
            .text(`${helpers.numberFormatters.formatComma(chartObj.state.monthTotal)} tonnes`) 

    };

};


/////////////////////////////////////////////////////////////////////////////////
///// BUILD FUNCTION TO LOAD SUPPORTING DATA AND CALL A RENDERING FUNCTION  /////
/////////////////////////////////////////////////////////////////////////////////


// Init function to load data and call generic buildVis function that is setup (and customised where necessary) for each 
function initVis(config) {
    // 1. Setup and specification of data endpoint tables
    d3.selectAll('.chart-container').style('opacity', 0)                  //  Hide charts for reveal
    const dataTables =  ['data_mrfOutput', 'data_materialsVicExport']   // Table names matched to the dataEndpointURls object (held in the data-endpoints.js file)

    // 2. Asynchronous data load (with Promise.all) and D3 (Fetch API) 
    Promise.all(
        dataTables.map(d => d3.tsv(dataEndpointURLs[d]) )
    ).then( rawData => {
        // a. Parse each loaded data table and store in data.table object, using the parseTable helper 
        rawData.forEach((tableData, i) => {parseTable(dataTables[i], tableData) })
        return chart.data
    }).then( async (data) => {
        // 3. Initiate vis build sequence with data now loaded
        await buildVis(config)
        d3.selectAll('.chart-container')        // Reveal chart
            .transition().duration(800)
            .style('opacity', null)     
    })

    // X. Table data and date parsing function: trim() header white space and prase numbers with "$" and "," stripped. 
    const parseTable = (tableName, tableData) => {
        chart.data[tableName] = tableData.map(row => {
            const newObj = {}
            Object.entries(row).forEach(([key, value]) => {
                switch(key.trim().toLowerCase()){
                    case 'date':
                        newObj[key] =  helpers.numberParsers.parseDateSlash(value)
                        break     
                    default:
                        newObj[key.trim()] = isNaN(parseFloat(value.replace(/\$|,/g, ''))) ? value : parseFloat(value.replace(/\$|,/g, '')) 
                }
            })
            return newObj
        })
    };   
}; // end buildFromGSheetData



//////////////////////////////////////////////////////////////////////////////
/// HELPER FUNCTIONS | Formatting and text manipulations helper functions  ///
//////////////////////////////////////////////////////////////////////////////

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
        formatMth_Year:         d3.timeFormat("%b-%Y"),
        formatMonthYear:        d3.timeFormat("%B %Y"),
        formatMthYear:          d3.timeFormat("%b %Y"),
        formatDateSlash:        d3.timeFormat("%d/%m/%Y")
    },
    numberParsers: {
        parseDateSlash:         d3.timeParse("%d/%m/%Y"),
        parseMonthYear:         d3.timeParse("%b-%Y"),
        parseDate:              d3.timeParse("%B %d, %Y")
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

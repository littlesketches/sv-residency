/////////////////////////////////////////
///// CHARTING METHODS ////
/////////////////////////////////////////

const charts = {
    line: {
        methods: {}    
    },
    layer: {
        methods: {}   
    }
}


/////////////////////////////////////////
//// MULTI-LINE TIME SERIES CHART   /////
/////////////////////////////////////////

charts.line.methods.renderLineChart = (svgID, data, settings) => {
    // 0. Setup Chart reference objects
    charts[svgID] = {
        labelFormat: {}
    }
    // 1. Access data 
    const seriesData = data.map(d => { 
        const newObj = {}
        Object.entries(d).forEach(([key, value]) => {
            if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                newObj[key] = value
            }
        })
        return newObj
    }).filter(d => d.date >= helpers.numberParsers.parseDateSlash(settings.axis.x.start) && d.date  <= helpers.numberParsers.parseDateSlash(settings.axis.x.end) )

    const slices = []
    settings.series.forEach(series => {
        slices.push( {
            [series]: seriesData.map(d => { 
                return {
                    date:       d.date, 
                    value:      d[series] 
                } 
            })
        })
    })

    // Set chart series and scales
    charts[svgID].series =  settings.series
    charts[svgID].seriesClass = settings.series.map(d => helpers.slugify(d))

    // 2. Create chart dimensions
    const svg = d3.select('#'+svgID).classed('line-chart', true),
        chartHeight = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom,
        chartWidth = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
        chartGroup = svg.append('g').classed('chart-group', true)
                        .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)

    // Set SVG and chart group dims
    svg.attr("viewBox", `0 0 ${settings.dims.width} ${settings.dims.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('width', '100%')

    //----------------------------- SCALES -----------------------------//
    const maxVolume = d3.max(seriesData.map(d => d3.max(Object.values(d).slice(1)) )),
        minVolume = d3.min([d3.min(seriesData.map(d => d3.min(Object.values(d).slice(1)))), 0])
    charts[svgID].scales = { xScale: null, yScale: null}

    switch(settings.scales.x.type){
        case 'time':
            charts[svgID].scales.xScale = d3.scaleTime().range([0, chartWidth]).domain(d3.extent(data, d => d.date))
            break
        case 'linear':
            charts[svgID].scales.xScale = d3.scaleLinear().range([0, chartWidth]).domain(d3.extent(data, d => d.date))
            break
    }
    switch(settings.scales.y.type){
        case 'linear':
            charts[svgID].scales.yScale = d3.scaleLinear().rangeRound([chartHeight, 0]).domain([ minVolume, maxVolume]).nice()
    }

    //---------------------------- AXES -------------------------------//
    switch(settings.scales.y.unit){
        case 'number':
            charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
            break
        case 'price':
            charts[svgID].labelFormat.yFormat = d3.format("$.1f")
            break
        default:
            charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
    }
    switch(settings.scales.x.unit){
        case 'date':
            charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
            break
        default:
            charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
    }

    charts[svgID].axis = {
        x:  d3.axisBottom()
                .ticks(25)
                .tickSize(4)
                .tickSizeOuter(0)
                .tickValues(charts[svgID].scales.xScale.ticks(18).concat(charts[svgID].scales.xScale.domain()[1]))
                .tickFormat(charts[svgID].labelFormat.xFormat)         // All month-year format (for now)
                .scale(charts[svgID].scales.xScale),

        y: d3.axisLeft()
                .ticks(10)
                .tickFormat(charts[svgID].labelFormat.yFormat)
                .scale(charts[svgID].scales.yScale)
    }

    //---------------------- SHAPE GENERATOR -------------------------//
    const line = d3.line()
        .x(d => charts[svgID].scales.xScale(d.date)  )
        .y(d => charts[svgID].scales.yScale(d.value) )
        .curve(d3.curveMonotoneX) 

    //----------------------------- AXES -----------------------------//
    chartGroup.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", "translate(0," + (charts[svgID].scales.yScale(0) - settings.axis.x.offset)+ ")")
        .call(charts[svgID].axis.x);

    chartGroup.append("g")
        .attr("class", "axis y-axis")
        .call(charts[svgID].axis.y)

    //---------------------------- LINES -----------------------------//
    const lineGroup = chartGroup.append("g")
        .classed("lines-group", true);

    const lines = lineGroup.selectAll(".line")
        .data(slices)
        .join("path")
            .attr("class", d => `${helpers.slugify(Object.keys(d)[0])} line`)
            .attr("d", d => line(Object.values(d)[0]) )

    //----------------------------LABELS-----------------------------//
    const annotationGroup = chartGroup.append("g")
        .classed("labels-group", true);

    annotationGroup.selectAll(".series-label")
        .data(slices)
        .join('text')
            .attr("class", d => helpers.slugify(Object.keys(d)[0])+" series-label")
            .datum(d => { return {
                    id: Object.keys(d)[0],
                    data: Object.values(d)[0][Object.values(d)[0].length - 1]
                } })
            .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x} ,  ${charts[svgID].scales.yScale(d.data.value) + settings.labelOffset[i].y})` )
            .attr("x", 0)
            .text( d => `${d.id}: ${charts[svgID].labelFormat.yFormat(d.data.value)} ${settings.axis.y.unit}`);

    const yLabel = annotationGroup.append("g")
        .attr("class", "axis-label y-axis")
        .attr("transform", "translate(-70, 0) rotate(-90) ")
    yLabel.append("text").classed('axis-label y', true)
        .attr("dy", ".75em")
        .text(settings.axis.y.label)

    const xLabel = annotationGroup.append("g")
        .attr("class", "axis-label y-axis")
        .attr("transform", `translate(${chartWidth}, ${chartHeight})`)
    xLabel.append("text").classed('axis-label x', true)
        .attr("dy", "50")
        .text(settings.axis.x.label)

    //--------------------------- POINTS -----------------------------// 
    const pointsGroup = chartGroup.append("g").classed("all-points-group", true),
        points = pointsGroup.selectAll(`#${svgID} g.series-points-group`)
            .data(slices)
            .join("g").attr('class', d=> helpers.slugify(Object.keys(d)[0])+' series-points-group')

    points.selectAll("g.linePoints-group")
        .append('g').classed('linePoints-group', true)
            .data(d => Object.values(d)[0])
            .join("circle")
                .attr("cx", d => charts[svgID].scales.xScale(d.date) )      
                .attr("cy", d => charts[svgID].scales.yScale(d.value) )    
                .attr("r", (d, i) =>  i < seriesData.length - 1 ? 2 : 3.5)
                .attr("class","point")
                .style("opacity", 1);

    //--------------------------- EVENTS -----------------------------//    
    points.selectAll("circles")
        .data(d => Object.values(d)[0] )
        .join("circle")
            .attr("cx", d => charts[svgID].scales.xScale(d.date) )      
            .attr("cy", d => charts[svgID].scales.yScale(d.value) )     
            .attr('index', (d,i) => i )     
            .attr('r', 10)
            .style("opacity", 0)
            .on('mouseover', circleMouseover)                
            .on("mouseout", circleMouseout)

    //------------------------ EVENT LISTENERS --------------------------//    
    function circleMouseover(d){
        const selection = d3.select(this).raise(),
            otherSeries = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.parentNode.classList[0]).map(d => '.'+d),
            xLabel = charts[svgID].labelFormat.xFormat(seriesData[+this.getAttribute('index')].date)
        charts.tooltip.transition()
            .delay(30)
            .duration(200)
            .style("opacity", 1);
        charts.tooltip.html(`<div class="tooltip-x">${xLabel}</div> 
                    <div class="tooltip-y">${charts[svgID].labelFormat.yFormat(d.value)} ${settings.axis.y.unit}</div>`)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 35) + "px");
        selection.transition()
            .delay(0)
            .duration(50)
            .attr("r", 6)
            .style("opacity", 1)
        d3.select('.series-label.'+this.parentNode.classList[0])
            .style('font-weight', 'bold')            
        d3.selectAll(otherSeries.toString()).classed('blur', true)
    }; // end circleMouseover

    function circleMouseout(d){
        const selection = d3.select(this),
            seriesClassSelector = settings.series.map(d => '.'+helpers.slugify(d)).toString()
        charts.tooltip.transition()        
            .duration(100)      
            .style("opacity", 0);  
        selection
            .transition()
            .delay(20)
            .duration(200)
            .attr("r", 2.5)
            .style("opacity", null);
        d3.select('.series-label.'+this.parentNode.classList[0])
            .style('font-weight', null)    
        d3.selectAll(seriesClassSelector).classed('blur', false)
    }; // end circleMouseout

}; // end Render line chart



/////////////////////////////////////////
//// MULTI-LINE TIME SERIES CHART   /////
/////////////////////////////////////////

charts.line.methods.renderMultiGroupLineChart = (svgID, data, settings) => {
    //------------------- 0. SETUP CHART DIMENSIONS, REFERENCES AND DATA OBJECTS -------------------------//
        charts[svgID] = {
            data:           {},
            labelFormat:    {},
            state:          {}             
        }
        // Set SVG and chart group dims
        const svg = d3.select('#'+svgID).classed('line-chart interactive', true),
            chartHeight = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom,
            chartWidth = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
            chartGroup = svg.append('g').classed('chart-group', true).attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)

        svg.attr("viewBox", `0 0 ${settings.dims.width} ${settings.dims.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('width', '100%')

        // Filter data for date range
        const dateFilter = d => d.date >= helpers.numberParsers.parseDateSlash(settings.axis.x.start) && d.date <= helpers.numberParsers.parseDateSlash(settings.axis.x.end)

    //--------- 1. SETUP CHART OPTIONS AND SERIES DATA | OPTION FOR INTERACTIVE FEATURES ------------------//
        if(settings.config.interactive){
            // a. Extract and set series and scales
            charts[svgID].series  = [...new Set(Object.keys(data[0]).filter(d => d !== 'date').map(d => d.slice(0, d.indexOf('_'))))].sort() 
            charts[svgID].chartOptions  = [...new Set(Object.keys(data[0]).filter(d => d !== 'date').map(d => d.slice(d.indexOf('_') + 1)))].sort() 
            charts[svgID].seriesClass = charts[svgID].series.map(d => helpers.slugify(d))

            // b. Create grouped data object
            charts[svgID].chartOptions.forEach( group => {
                charts[svgID].data[group] = data.map(object => {
                    const obj = {date: object.date}
                    charts[svgID].series.forEach(seriesName => {
                        obj[seriesName] = object[`${seriesName}_${group}`]
                    })
                    return obj
                })
            })

            // c. Add a dropdown selector for series grouping
            const svgContainer = d3.select(svg.node().parentNode),
                selectorContainer = svgContainer.insert("div",`#${svgID}`)
                                .classed('selector-container', true),
                selectorLabel = selectorContainer.append('label')
                                .attr('for', `${svgID}-materials`)
                                .html('View:')
                selectGroup = selectorContainer.append('select')
                                .attr('id', `${svgID}-selector`)
                                .attr('name', `${svgID}-materials`)
                                .on('change', function(){ charts.line.methods.updateInteractiveLineChart(this, svgID, settings)} )

            charts[svgID].chartOptions.forEach( group =>  selectGroup.append('option').attr('value', group).html(group) )
        }

        // d. Set current state, (starting) chart data amd selector
        charts[svgID].state.dataGroup = settings.group ? settings.group : selectGroup.node().value  
        charts[svgID].chartData = charts[svgID].data[charts[svgID].state.dataGroup]
        document.getElementById(`${svgID}-selector`).value = charts[svgID].state.dataGroup 

        // e. Shape series data into slices for rendering:
        const seriesData = charts[svgID].chartData.map(d => { 
            const newObj = {}
            Object.entries(d).forEach(([key, value]) => {
                if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                    newObj[key] = value
                }
            })
            return newObj
        }).filter(dateFilter)

        const slices = []
        settings.series.forEach(series => {
            slices.push( {
                [series]: seriesData.map(d => { 
                    return {
                        date:       d.date, 
                        value:      d[series] 
                    } 
                })
            })
        })


    //----------------------------- 2. SET UP SCALES AND AXES -----------------------------//
        // a. Setup axes scales from series data
        const maxVolume = d3.max(seriesData.map(d => d3.max(Object.values(d).slice(1)) )),
            minVolume = d3.min([d3.min(seriesData.map(d => d3.min(Object.values(d).slice(1)))), 0])
        charts[svgID].scales = { xScale: null, yScale: null}

        switch(settings.scales.x.type){
            case 'time':
                charts[svgID].scales.xScale = d3.scaleTime().range([0, chartWidth]).domain(d3.extent(data.filter(dateFilter), d => d.date))
                break
            case 'linear':
                charts[svgID].scales.xScale = d3.scaleLinear().range([0, chartWidth]).domain(d3.extent(data.filter(dateFilter), d => d.date))
                break
        }
        switch(settings.scales.y.type){
            case 'linear':
                charts[svgID].scales.yScale = d3.scaleLinear().rangeRound([chartHeight, 0]).domain([ minVolume, maxVolume]).nice()
        }

        // b. Set axes label formatting
        switch(settings.scales.y.unit){
            case 'number':
                charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
                break
            case 'price':
                charts[svgID].labelFormat.yFormat = d3.format("$.1f")
                break
            default:
                charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
        }
        switch(settings.scales.x.unit){
            case 'date':
                charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
                break
            default:
                charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
        }

        charts[svgID].axis = {
            x:  d3.axisBottom()
                    .tickSize(4)
                    .tickSizeOuter(0)
                    .tickValues(charts[svgID].scales.xScale.ticks(10).concat(charts[svgID].scales.xScale.domain()[1]))
                    .tickFormat(charts[svgID].labelFormat.xFormat)         // All month-year format (for now)
                    .scale(charts[svgID].scales.xScale),

            y: d3.axisLeft()
                    .ticks(5)
                    .tickFormat(charts[svgID].labelFormat.yFormat)
                    .scale(charts[svgID].scales.yScale)
        }

        // c. Append and call the axes rendering functions
        chartGroup.append("g").attr("class", "axis x-axis")
            .attr("transform", "translate(0," + (charts[svgID].scales.yScale(0) - settings.axis.x.offset)+ ")")
            .call(charts[svgID].axis.x);

        chartGroup.append("g").attr("class", "axis y-axis")
            .call(charts[svgID].axis.y)

    //---------------------- 3. ACCESSORS, SHAPE GENERATOR AND RENDERING OF LINES -------------------------//
        const xAccessor = d => charts[svgID].scales.xScale(d.date)
        const yAccessor = d => charts[svgID].scales.yScale(d.value) 

        const line = d3.line().curve(d3.curveMonotoneX) 
            .x(xAccessor)
            .y(yAccessor)
            
        const lineGroup = chartGroup.append("g").classed("lines-group", true);

        const lines = lineGroup.selectAll(".line")
            .data(slices)
            .join("path")
                .attr("class", d => `${helpers.slugify(Object.keys(d)[0])} line`)
                .attr("d", d => line(Object.values(d)[0]) )


    //---------------------------- 4. SERIES AND AXES LABELS -----------------------------//
        const annotationGroup = chartGroup.append("g").classed("labels-group", true);
        const getDatumObj  = d => { return {
                                        id: Object.keys(d)[0],
                                        data: Object.values(d)[0][Object.values(d)[0].length - 1]
                                    }
                                }

        // a. Series labels
        annotationGroup.selectAll(".series-label")
            .data(slices)
            .join('text')
                .attr("class", d => helpers.slugify(Object.keys(d)[0])+" series-label")
                .datum(getDatumObj)
                .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x} ,  ${charts[svgID].scales.yScale(d.data.value) + settings.labelOffset[i].y})` )
                .text( d => `${d.id}: ${charts[svgID].labelFormat.yFormat(d.data.value)} ${settings.axis.y.unit}`)
                    .on('mouseover', labelMouseover)
                    .on('mouseout', labelMouseout)

        // b. Axes labels
        const yLabel = annotationGroup.append("g")
            .attr("class", "axis-label y-axis")
            .attr("transform", "translate(-50, -5) rotate(-90) ")
        yLabel.append("text").classed('axis-label y', true)
            .attr("dy", ".75em")
            .text(settings.axis.y.label)

        const xLabel = annotationGroup.append("g")
            .attr("class", "axis-label x-axis")
            .attr("transform", `translate(${chartWidth}, ${chartHeight})`)
        xLabel.append("text").classed('axis-label x', true)
            .attr("dy", "50")
            .text(settings.axis.x.label)

        // c. Custom labels 
            // i. Landfill series description sub-label: added to landfill label to differentiate contamination and garbage collections
            if(charts[svgID].series.indexOf('Landfill') > -1){
                annotationGroup.selectAll(".series-sublabel")
                    .data(slices)
                    .join('text')
                        .attr("class", d => helpers.slugify(Object.keys(d)[0])+" series-sublabel")
                        .datum(getDatumObj)
                        .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x} , ${charts[svgID].scales.yScale(d.data.value) + 5 + settings.labelOffset[i].y})` )
                        .attr("dy", 6)
                        .text( d => d.id === 'Landfill' ? 'from contaminated materials' : '' )
                        .style('display', d => d.id === 'Landfill' ?  'auto' : 'none')
                            .on('mouseover', labelMouseover)
                            .on('mouseout', labelMouseout)
            }


    //--------------------------- 5. DATA CIRCLE POINTS -----------------------------// 
    const pointsGroup = chartGroup.append("g").classed("all-points-group", true),
        points = pointsGroup.selectAll(`#${svgID} g.series-points-group`)
            .data(slices)
            .join("g").attr('class', d=> helpers.slugify(Object.keys(d)[0])+' series-points-group')

    points.selectAll(`#${svgID} g.linePoints-group`)
        .append('g').classed('linePoints-group', true)
            .data(d => Object.values(d)[0])
            .join("circle")
                .attr('index', (d,i) => i)
                .attr("cx", xAccessor )      
                .attr("cy", yAccessor )    
                .attr("r", (d, i) =>  i < seriesData.length - 1 ? 2 : 5)
                .attr("class","linePoint")
                .style("opacity", 1)
                    .on('mouseover', circleMouseover)                
                    .on("mouseout", circleMouseout)

    //------------------------ 6. EVENT LISTENERS --------------------------//    
    function circleMouseover(d){
        const selection = d3.select(this),
            otherSeries = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.parentNode.classList[0]).map(d => '.'+d),
            xLabel = charts[svgID].labelFormat.xFormat(seriesData[+this.getAttribute('index')].date)
        charts.tooltip.transition().duration(200).delay(30)
            .style("opacity", 1);
        charts.tooltip.html(`<div class="tooltip-x">${xLabel}</div> 
                    <div class="tooltip-y">${charts[svgID].labelFormat.yFormat(d.value)} ${settings.axis.y.unit}</div>`)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 35) + "px");
        selection.transition().duration(50).delay(0)             
            .attr("r", 5)
        d3.select('.series-label.'+this.parentNode.classList[0])
            .style('font-weight', 'bold')            
        d3.selectAll(otherSeries.toString()).classed('blur', true)
    }; // end circleMouseover

    function circleMouseout(d){
        const selection = d3.select(this),
            seriesClassSelector = settings.series.map(d => '.'+helpers.slugify(d)).toString()
        charts.tooltip.transition().duration(100)      
            .style("opacity", 0);  
        selection.transition().delay(20).duration(200)
            .attr("r", d=> +this.getAttribute('index') < seriesData.length - 1 ? 2 : 5)
            .style("opacity", null);
        d3.select('.series-label.'+this.parentNode.classList[0])
            .style('font-weight', null)    
        d3.selectAll(seriesClassSelector).classed('blur', false)
    }; // end circleMouseout

    function labelMouseover(d){
        const selection = d3.select(this),
            otherSeries = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.classList[0]).map(d => '.'+d),
            xLabel = charts[svgID].labelFormat.xFormat(seriesData[+this.getAttribute('index')].date)
        d3.select('.series-label.'+this.classList[0])
            .style('font-weight', 'bold')    
        d3.selectAll(otherSeries.toString()).classed('blur', true)
    }; // end circleMouseover

    function labelMouseout(d){
        const selection = d3.select(this),
            seriesClassSelector = settings.series.map(d => '.'+helpers.slugify(d)).toString()
        selection.transition().delay(20).duration(200)
            .attr("r", d=> +this.getAttribute('index') < seriesData.length - 1 ? 2 : 5)
            .style("opacity", null);
        d3.select('.series-label.'+this.parentNode.classList[0])
            .style('font-weight', null)    
        d3.selectAll(seriesClassSelector).classed('blur', false)
    }; // end circleMouseover


}; // end renderMultiGroupLineChart()


charts.line.methods.updateInteractiveLineChart = (selector, svgID, settings) => {
    const group = selector.value, duration = 2000
    // Pause pointer events for the duration of the transition
    d3.selectAll(`#${svgID} *`).style('pointer-events', 'none')
    setTimeout( () => { d3.selectAll(`#${svgID} *`).style('pointer-events', null)}, duration)

    //------------------------------- 0. UPDATE CHART DATA ---------------------------------//
        // a. Set current state and chart data
        charts[svgID].state.dataGroup = group
        charts[svgID].chartData =  charts[svgID].data[group]
        const dateFilter = d => d.date >= helpers.numberParsers.parseDateSlash(settings.axis.x.start) && d.date <= helpers.numberParsers.parseDateSlash(settings.axis.x.end)
        const xAccessor = d => charts[svgID].scales.xScale(d.date)
        const yAccessor = d => charts[svgID].scales.yScale(d.value) 
        const getDatumObj  = d => { return {
                                        id: Object.keys(d)[0],
                                        data: Object.values(d)[0][Object.values(d)[0].length - 1]
                                    }
                                }

        const seriesData = charts[svgID].chartData.map(d => { 
            const newObj = {}
            Object.entries(d).forEach(([key, value]) => {
                if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                    newObj[key] = value
                }
            })
            return newObj
        }).filter(dateFilter)

        const slices = []
        settings.series.forEach(series => {
            slices.push( {
                [series]: seriesData.map(d => { 
                    return {
                        date:       d.date, 
                        value:      d[series] 
                    } 
                })
            })
        })

    //----------------------------- 2. SET UP SCALES AND AXES -----------------------------//
        // a. Setup scales (y axis)
        const maxVolume = d3.max(seriesData.map(d => d3.max(Object.values(d).slice(1)) )),
            minVolume = d3.min([d3.min(seriesData.map(d => d3.min(Object.values(d).slice(1)))), 0])
        // b. Update X and Y axis
        charts[svgID].scales.yScale.domain([ minVolume, maxVolume]).nice()
        charts[svgID].axis.y = d3.axisLeft().scale(charts[svgID].scales.yScale).ticks(6)
        // c. Call transition to new axis 
        d3.select(`#${svgID} .axis.y-axis`)
            .transition().duration(duration)
            .call(charts[svgID].axis.y)

    //---------------------- 3. UPDATE LINES-------------------------//
        const line = d3.line().curve(d3.curveMonotoneX) 
            .x(xAccessor)
            .y(yAccessor)
            
        d3.selectAll(`#${svgID} .line`)
            .data(slices)
            .transition().duration(duration)
                .attr("d", d => line(Object.values(d)[0]) )

    //---------------------------- 4. UPDATE LABEL POSITION AND VALUES-----------------------------//
        d3.selectAll(`#${svgID} .series-label`)
            .data(slices)
            .datum(getDatumObj)
            .transition().duration(duration)
                .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x}, ${charts[svgID].scales.yScale(d.data.value) + settings.labelOffset[i].y})` )
                .tween("text", function(d) {
                    let that = d3.select(this),
                        i = d3.interpolateNumber(parseFloat(this.innerHTML.replace(/\D/g,'')), d.data.value );
                    return function(t) {   that.text(`${d.id}: ${charts[svgID].labelFormat.yFormat(i(t))} ${settings.axis.y.unit}`)  };
                })

        if(charts[svgID].series.indexOf('Landfill') > -1){
            d3.selectAll(".series-sublabel")
                .data(slices)
                .datum(getDatumObj)
                .transition().duration(duration)
                    .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x} , ${charts[svgID].scales.yScale(d.data.value) + 5 + settings.labelOffset[i].y})` )
                    .text( d => d.id === 'Landfill' ?  'from contaminated collection' : '' )
        }


    //--------------------------- 5. UPDATE DATA CIRCLE POINTS -----------------------------// 
    const points = d3.selectAll(`#${svgID} g.series-points-group`).data(slices)

    points.selectAll(`#${svgID} .linePoint`)
        .data(d =>  Object.values(d)[0])
        .style('pointer-events', 'none')
        .transition().duration(duration)
            .attr("cx", xAccessor )      
            .attr("cy", yAccessor )    
            .attr("r", (d, i) =>  i < seriesData.length - 1 ? 2 : 3.5)
  
    points.selectAll(`#${svgID} .linePoint-hover`)
        .data(d => Object.values(d)[0] )
        .style('pointer-events', 'none')
        .transition().duration(duration)
            .attr("cx", xAccessor )      
            .attr("cy", yAccessor )       

}; // end update InteractiveLineChart



//////////////////////////////////////////////////////////////////////////
//// MULTI-SERIES LAYER CHART WITH SMALL MULTIPLES TRANSITION VIEW   /////
//////////////////////////////////////////////////////////////////////////

charts.layer.methods.renderLayerChart = (svgID, data, settings) => {
    //------------------------- SVG  SETUP ---------------------------//    
    charts[svgID] = {
        data:           {
            chartData:  data 
        },
        labelFormat:    {},
        state:          {
            layout:     'stacked' 
        }   
    }

    const svg = d3.select('#'+svgID).classed('layer-chart', true),
        chartHeight = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom,
        chartWidth = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
        chartGroup = svg.append('g').classed('chart-group', true)
                        .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)

    svg.attr("viewBox", `0 0 ${settings.dims.width} ${settings.dims.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('width', '100%')

    const wedgeGroup = chartGroup.append("g").classed("wedges-group", true),
        lineGroup = chartGroup.append("g").classed("lines-group", true),
        pointsGroup = chartGroup.append('g').classed("all-points-group", true),
        annotationGroup = chartGroup.append("g").classed("labels-group", true)


    //--------------------- DATA TRANSFORMATION -----------------------//   
    charts[svgID].series =  settings.series
    charts[svgID].seriesClass = settings.series.map(d => helpers.slugify(d))
    charts[svgID].settings = settings

    charts[svgID].data.seriesData = data.map(d => { 
        const newObj = {}
        Object.entries(d).forEach(([key, value]) => {
            if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                newObj[key] = value
            }
        })
        return newObj
    }).filter(d => d.date >= helpers.numberParsers.parseDateSlash(settings.axis.x.start) && d.date  <= helpers.numberParsers.parseDateSlash(settings.axis.x.end) )

        // i. Series 'slices' data 
        charts[svgID].data.slices = []
        settings.series.forEach(series => {
            charts[svgID].data.slices.push( {
                [series]: charts[svgID].data.seriesData.map(d => { 
                    return {
                        date:       d.date, 
                        value:      d[series],
                        key:        series
                    } 
                })
            })
        })
        // ii. Series total line data
        charts[svgID].data.seriesTotal = [{
            Total: charts[svgID].data.seriesData.map( d => {
                let total = 0
                settings.series.forEach(series => total += d[series])
                return {
                    date:   d.date,
                    value:  total
                }
            })
        }]
        // iii. Series stacked data
        charts[svgID].data.stackedData = d3.stack().keys(settings.series)(charts[svgID].data.seriesData)

    //----------------------------- SCALES -----------------------------//    
    const extent = d3.extent(charts[svgID].data.seriesData.map(d => Object.keys(d).filter(key => key !== 'date')
                            .reduce((obj, key) => {
                                obj[key] = d[key];
                                return obj;
                            }, {}))
                            .map(d => d3.sum(Object.values(d)))
    )
    charts[svgID].scales = { xScale: null, yScale: null}

    switch(settings.scales.x.type){
        case 'time':
            charts[svgID].scales.xScale = d3.scaleTime().range([0, chartWidth]).domain(d3.extent(data, d => d.date))
            break
        case 'linear':
            charts[svgID].scales.xScale = d3.scaleLinear().range([0, chartWidth]).domain(d3.extent(data, d => d.date))
            break
    }

    switch(settings.scales.y.type){
        case 'linear':
            charts[svgID].scales.yScale = d3.scaleLinear().rangeRound([chartHeight, 0]).domain([d3.min([0,extent[0]]), extent[1]]).nice()
    }

    //-------------- AXES | CONFIGURED FROM SETTINGS OPTIONS ----------------//
    switch(settings.scales.y.unit){
        case 'number':
            charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
            break
        case 'price':
            charts[svgID].labelFormat.yFormat = d3.format("$.1f")
            break
        default:
           charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
    }

    switch(settings.scales.x.unit){
        case 'date':
            charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
            break
        default:
            charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
    }

    charts[svgID].axis = {
        x:  d3.axisBottom()
                .ticks(25)
                .tickSize(4)
                .tickSizeOuter(0)
                .tickValues(charts[svgID].scales.xScale.ticks(18).concat(charts[svgID].scales.xScale.domain()[1]))
                .tickFormat(charts[svgID].labelFormat.xFormat)         // All month-year format (for now)
                .scale(charts[svgID].scales.xScale),

        y: d3.axisLeft()
                .ticks(10)
                .tickFormat(charts[svgID].labelFormat.yFormat)
                .scale(charts[svgID].scales.yScale)
    }

    //------------------------ SHAPE GENERATORS -------------------------//
    const stackedArea = d3.area().curve(d3.curveMonotoneX) 
        .x( d => charts[svgID].scales.xScale(d.data.date))
        .y0( d => charts[svgID].scales.yScale(d[0]))
        .y1( d => charts[svgID].scales.yScale(d[1])) 

    const line = d3.line().curve(d3.curveMonotoneX) 
        .x(d => charts[svgID].scales.xScale(d.date)  )
        .y(d => charts[svgID].scales.yScale(d.value) )
        
    //----------------------------- AXES -----------------------------//
    chartGroup.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0, ${charts[svgID].scales.yScale(0) - settings.axis.x.offset})`)
        .call(charts[svgID].axis.x);

    chartGroup.append("g")
        .attr("class", "axis y-axis")
        .call(charts[svgID].axis.y)

    //------------------------ ADD LAYERS ----------------------------//
    const wedges = wedgeGroup.selectAll(`#${svgID} .wedge`)
        .data(charts[svgID].data.stackedData)
        .join("path")
            .attr("class", (d, i) => `${helpers.slugify(settings.series[i])} wedge`)
            .attr("d", stackedArea)
            .on('mouseover', wedgeMouseover)                
            .on("mouseout", wedgeMouseout);

    //--------------------------- LABELS ----------------------------//
    const seriesLength = charts[svgID].data.seriesData.length
    // Wedge labels
    annotationGroup.selectAll(`#${svgID} .series-label`)
        .data(charts[svgID].data.slices)
        .join('text')
            .attr("class", d => helpers.slugify(Object.keys(d)[0])+" series-label")
            .datum(d => { return {
                    id: Object.keys(d)[0],
                    data: Object.values(d)[0][Object.values(d)[0].length - 1]
                } })
            .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x} , 
                                                    ${charts[svgID].scales.yScale(charts[svgID].data.stackedData[i][seriesLength-1][0] 
                                                        + (charts[svgID].data.stackedData[i][seriesLength-1][1] - charts[svgID].data.stackedData[i][seriesLength-1][0])/2) + 5 + settings.labelOffset[i].y})` )
            .attr("x", 0)
            .attr("dy", -2)
            .text( d => `${d.id}: ${charts[svgID].labelFormat.yFormat(d.data.value)} ${settings.axis.y.unit}`)
            .on('mouseover', wedgeMouseover)                
            .on("mouseout", wedgeMouseout);

    // Axes labels
    const yLabel = annotationGroup.append("g")
        .attr("class", "axis-label y-axis")
        .attr("transform", `translate(-${settings.dims.margin.left -10}, 0) rotate(-90)`)
    yLabel.append("text").classed('axis-label y', true)
        .attr("dy", ".75em")
        .text(settings.axis.y.label)

    const xLabel = annotationGroup.append("g")
        .attr("class", "axis-label y-axis")
        .attr("transform", `translate(${chartWidth}, ${chartHeight})`)
    xLabel.append("text").classed('axis-label x', true)
        .attr("dy", "50")
        .text(settings.axis.x.label)

    //---------------- ADD TOTALS LINE AND DOTS (IF SPECIFIED) -------------------//
    if(settings.options.addTotalLine){  // Totals line added if specified in the charts settings configuration
        // Set chart series and scales
        const lines = lineGroup.selectAll(".line")
            .data(charts[svgID].data.seriesTotal)
            .join("path")
                .attr("class", d => `${helpers.slugify(Object.keys(d)[0])} line`)
                .attr("d", d => line(Object.values(d)[0]) )

        // Dots for data points
        const totalPoints = pointsGroup.selectAll(`#${svgID} g.series-point-group`)
                .data(charts[svgID].data.seriesTotal)
                .join("g")
                    .attr('class', d => helpers.slugify(Object.keys(d)[0])+' seriesTotal-points-group')

        totalPoints.selectAll(`#${svgID} .points-group`)
            .append('g').classed('linePoints-group', true)
                .data(d => Object.values(d)[0])
                .join("circle")
                    .attr("cx", d => charts[svgID].scales.xScale(d.date) )      
                    .attr("cy", d => charts[svgID].scales.yScale(d.value) )    
                    .attr("r", (d, i) =>  i < seriesLength - 1 ? 2.5 : 4)
                    .attr("class", "total-point")
                    .style("opacity", 1)
                    .on('mouseover', circleMouseover)
                    .on('mouseout', circleMouseout)

        // Totals label
        const totalLineLabel = annotationGroup.append("g").classed('totalLine-label-group', true),
            latestDatum = charts['chart-vic-export-materials'].data.seriesTotal[0].Total[charts['chart-vic-export-materials'].data.seriesTotal[0].Total.length-1]
        
        totalLineLabel.append('line').classed('leader-line', true)
            .attr('x1', charts[svgID].scales.xScale(latestDatum.date))
            .attr('y1', charts[svgID].scales.yScale(latestDatum.value) - 5)
            .attr('x2', charts[svgID].scales.xScale(latestDatum.date))
            .attr('y2', charts[svgID].scales.yScale(latestDatum.value) - 25)
        totalLineLabel.append('line').classed('leader-line', true)
            .attr('x1', charts[svgID].scales.xScale(latestDatum.date))
            .attr('y1', charts[svgID].scales.yScale(latestDatum.value) - 25)
            .attr('x2', charts[svgID].scales.xScale(latestDatum.date) + 5)
            .attr('y2', charts[svgID].scales.yScale(latestDatum.value) - 25)

        totalLineLabel.append('text') 
            .classed("total series-label", true)
            .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(latestDatum.date) + 10 + settings.labelOffset[i].x} ,  ${charts[svgID].scales.yScale(latestDatum.value) - 20})` )
            .text(`Total: ${charts[svgID].labelFormat.yFormat(latestDatum.value)} ${settings.axis.y.unit}`)
    }

    //------------ ADD SERIES DOTS (IF SPECIFIED) FOR MULTIPLES TRANSITION-------------------//
    const points = pointsGroup.selectAll(`#${svgID} g.series-points-group`)
            .data(charts[svgID].data.slices)
            .join("g").attr('class', d=> helpers.slugify(Object.keys(d)[0])+' series-points-group')

        // points.selectAll("g.linePoints-group")
        //     .append('g').classed('linePoints-group', true)
        //         .data(d => Object.values(d)[0])
        //         .join("circle")
        //         .attr("cx", d => charts[svgID].scales.xScale(d.date) )      
        //         .attr("cy", d => charts[svgID].scales.yScale(d.value) )    
        //         .attr('r', (d, i) =>  i < seriesLength.length - 1 ? 2 : 3.5)
        //         .attr('class', 'point')
        //         .style("opacity", 1)


    //--------------------- SVG TOGGLE BUTTON -----------------------//   
    if(document.getElementById(svgID)){
        const parentContainer = document.getElementById(svgID).parentElement,
            parentID = parentContainer.id,
            chartSelectorContainer = d3.select('#'+parentID).append('div').classed('chart-selector-container', true),
            onOffSwitch = chartSelectorContainer.append('div').classed('onoffswitch layer-chart', true),
            input = onOffSwitch.append('input')
                        .attr('id', svgID+'-chartview-switch')
                        .classed('onoffswitch-checkbox', true) 
                        .attr('type', 'checkbox') 
                        .attr('name', 'onoffswitch') 
                        .attr('tabindex', 0) 
                        .attr('checked', true) 
                        .on('click',  () => charts.layer.methods.toggleMultiples(svgID) ),
            labelContainer = onOffSwitch.append('label')
                        .classed('onoffswitch-label', true) 
                        .attr('for', `${svgID}-chartview-switch`)

        labelContainer.append('span').classed('onoffswitch-inner', true)
        labelContainer.append('span').classed('onoffswitch-switch', true)
    }

     //--------------------- EVENT LISTENERS --------------------//
        function wedgeMouseover(d){
            const selection = d3.select(this),
                otherWedges = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.classList[0]).map(d => '.wedge.'+d),
                otherLabels =settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.classList[0]).map(d => '.series-label.'+d)
            d3.select('.series-label.'+this.classList[0]).style('font-weight', 'bold')            
            d3.selectAll(`${otherWedges.toString()} , ${otherLabels.toString()} , .lines-group, .all-points-group, .totalLine-label-group`)
                .classed('blur', true)
        }; // wedgeMouseover

        function wedgeMouseout(d){
            d3.selectAll('.series-label, .wedge, .lines-group, .all-points-group, .totalLine-label-group')
                .style('font-weight', null)  
                .classed('blur', false)  
        };  // wedgeMouseout

        function circleMouseover(d){
            const selection = d3.select(this),
                    otherSeries = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.parentNode.classList[0]).map(d => '.'+d),
                    xLabel = charts[svgID].labelFormat.xFormat(charts[svgID].data.seriesData[+this.getAttribute('index')].date)
                charts.tooltip.transition()
                    .delay(30)
                    .duration(200)
                    .style("opacity", 1);
                charts.tooltip.html(`<div class="tooltip-x">${xLabel}</div> 
                            <div class="tooltip-y">${charts[svgID].labelFormat.yFormat(d.value)} ${settings.axis.y.unit}</div>`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 35) + "px");
                selection.transition()
                    .delay(0)
                    .duration(50)
                    .attr("r", 6)
                    .style("opacity", 1)
                d3.select('.series-label.'+this.parentNode.classList[0])
                    .style('font-weight', 'bold')            
                d3.selectAll(`${otherSeries.toString()}, .totalLine-label-group`).classed('blur', true)
        };  // circleMouseover      

        function circleMouseout(d){
            const selection = d3.select(this),
                seriesClassSelector = settings.series.map(d => '.'+helpers.slugify(d)).toString()
            charts.tooltip.transition()        
                .duration(100)      
                .style("opacity", 0);  
            selection
                .transition()
                .delay(20)
                .duration(200)
                .attr("r", 2.5)
                .style("opacity", null);
            d3.select('.series-label.'+this.parentNode.classList[0])
                .style('font-weight', null)    
            d3.selectAll(`${seriesClassSelector}, .totalLine-label-group`).classed('blur', false)
        }; // circleMouseout  

}; // end Render line chart


charts.layer.methods.renderMultiGroupLayerChart = (svgID, data, settings) => {

    //----------------- 0. SETUP CHART DIMENSIONS, REFERENCES AND DATA OBJECTS  ----------------------//    
        charts[svgID] = {
            data:           {},
            rawData:        {},
            labelFormat:    {},
            settings:       settings,
            state:          {
                layout:     'stacked'
            }    
        }

        // Set SVG and chart group dims
        const svg = d3.select('#'+svgID).classed('layer-chart', true),
            chartHeight = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom,
            chartWidth = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
            chartGroup = svg.append('g').classed('chart-group', true)
                            .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)

        svg.attr("viewBox", `0 0 ${settings.dims.width} ${settings.dims.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('width', '100%')

        const wedgeGroup = chartGroup.append("g").classed("wedges-group", true),
            lineGroup = chartGroup.append("g").classed("lines-group", true),
            pointsGroup = chartGroup.append('g').classed("all-points-group", true),
            annotationGroup = chartGroup.append("g").classed("labels-group", true)


    //--------- 1. SETUP CHART OPTIONS AND SERIES DATA | OPTION FOR INTERACTIVE FEATURES ------------//
        if(settings.config.interactive){
            // a. Extract and set series and scales
            charts[svgID].series  = [...new Set(Object.keys(data[0]).filter(d => d !== 'date').map(d => d.slice(0, d.indexOf('_'))))].sort() 
            charts[svgID].chartOptions  = [...new Set(Object.keys(data[0]).filter(d => d !== 'date').map(d => d.slice(d.indexOf('_') + 1)))].sort() 
            charts[svgID].seriesClass = charts[svgID].series.map(d => helpers.slugify(d))

            // b. Create grouped data object
            charts[svgID].chartOptions.forEach( group => {
                charts[svgID].rawData[group] = data.map(object => {
                    const obj = {date: object.date}
                    charts[svgID].series.forEach(seriesName => {
                        obj[seriesName] = object[`${seriesName}_${group}`]
                    })
                    return obj
                })
            })

            // c. Add a dropdown selector for series grouping
            const svgContainer = d3.select(svg.node().parentNode),
                selectorContainer = svgContainer.insert("div",`#${svgID}`).classed('selector-container', true),
                selectorLabel = selectorContainer.append('label').attr('for', `${svgID}-materials`)
                                .html('View:')
                selectGroup = selectorContainer.append('select')
                                .attr('id', `${svgID}-selector`)
                                .attr('name', `${svgID}-materials`)
                                .on('change', function(){ charts.line.methods.updateMultiGroupLayerChart(this, svgID, settings)} )

            charts[svgID].chartOptions.forEach( group => {
                selectGroup.append('option').attr('value', group).html(group)
            })
        }

        // d. Set current state, (starting) chart data amd selector
        charts[svgID].state.dataGroup = settings.group ? settings.group : selectGroup.node().value  
        charts[svgID].chartData = charts[svgID].rawData[charts[svgID].state.dataGroup]
        document.getElementById(`${svgID}-selector`).value = charts[svgID].state.dataGroup 

        // e. Shape series data for rendering:
        charts[svgID].chartData = charts[svgID].rawData[charts[svgID].state.dataGroup].map(d => { 
            const newObj = {}
            Object.entries(d).forEach(([key, value]) => {
                if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                    newObj[key] = value
                }
            })
            return newObj
        }).filter(d => d.date >= helpers.numberParsers.parseDateSlash(settings.axis.x.start) && d.date  <= helpers.numberParsers.parseDateSlash(settings.axis.x.end) )



            // i. Series 'slices' data 
            charts[svgID].data.slices = []
            charts[svgID].series.forEach(series => {
                charts[svgID].data.slices.push( {
                    [series]: charts[svgID].chartData.map(d => { 
                        return {
                            date:       d.date, 
                            value:      d[series],
                            key:        series
                        } 
                    })
                })
            })
            // ii. Series total line data
            charts[svgID].data.seriesTotal = [{
                Total: charts[svgID].chartData.map( d => {
                    let total = 0
                    settings.series.forEach(series => total += d[series])
                    return {
                        date:   d.date,
                        value:  total
                    }
                })
            }]
            // iii. Series stacked data
            charts[svgID].data.stackedData = d3.stack().keys(settings.series)(charts[svgID].chartData)

    //------------------- 2. SET UP SCALES AND AXES  ----------------------//    
        // a. Setup axes scales from series data
        const extent = d3.extent(charts[svgID].chartData.map(d => Object.keys(d).filter(key => key !== 'date')
                                .reduce((obj, key) => {
                                    obj[key] = d[key];
                                    return obj;
                                }, {}))
                                .map(d => d3.sum(Object.values(d)))
        )
        charts[svgID].scales = { xScale: null, yScale: null}

        switch(settings.scales.x.type){
            case 'time':
                charts[svgID].scales.xScale = d3.scaleTime().range([0, chartWidth]).domain(d3.extent(data, d => d.date))
                break
            case 'linear':
                charts[svgID].scales.xScale = d3.scaleLinear().range([0, chartWidth]).domain(d3.extent(data, d => d.date))
                break
        }

        switch(settings.scales.y.type){
            case 'linear':
                charts[svgID].scales.yScale = d3.scaleLinear().rangeRound([chartHeight, 0]).domain([d3.min([0,extent[0]]), extent[1]]).nice()
        }

        // b. Set axes label formatting
        switch(settings.scales.y.unit){
            case 'number':
                charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
                break
            case 'price':
                charts[svgID].labelFormat.yFormat = d3.format("$.1f")
                break
            default:
            charts[svgID].labelFormat.yFormat = d3.format(",.0f")	
        }

        switch(settings.scales.x.unit){
            case 'date':
                charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
                break
            default:
                charts[svgID].labelFormat.xFormat = d3.timeFormat('%b %Y')
        }

        charts[svgID].axis = {
            x:  d3.axisBottom()
                    .ticks(25)
                    .tickSize(4)
                    .tickSizeOuter(0)
                    .tickValues(charts[svgID].scales.xScale.ticks(18).concat(charts[svgID].scales.xScale.domain()[1]))
                    .tickFormat(charts[svgID].labelFormat.xFormat)         // All month-year format (for now)
                    .scale(charts[svgID].scales.xScale),

            y: d3.axisLeft()
                    .ticks(10)
                    .tickFormat(charts[svgID].labelFormat.yFormat)
                    .scale(charts[svgID].scales.yScale)
        }

        // c. Append and call the axes rendering functions
        chartGroup.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0, ${charts[svgID].scales.yScale(0) - settings.axis.x.offset})`)
            .call(charts[svgID].axis.x);

        chartGroup.append("g")
            .attr("class", "axis y-axis")
            .call(charts[svgID].axis.y)


    //--------------- 3. SHAPE GENERATOR AND RENDERING OF LAYERS AND LINES ------------------//
        const stackedArea = d3.area().curve(d3.curveMonotoneX) 
            .x( d => charts[svgID].scales.xScale(d.data.date))
            .y0( d => charts[svgID].scales.yScale(d[0]))
            .y1( d => charts[svgID].scales.yScale(d[1])) 

        const line = d3.line().curve(d3.curveMonotoneX) 
            .x(d => charts[svgID].scales.xScale(d.date)  )
            .y(d => charts[svgID].scales.yScale(d.value) )
         
        const wedges = wedgeGroup.selectAll(`#${svgID} .wedge`)
            .data(charts[svgID].data.stackedData)
            .join("path")
                .attr("class", (d, i) => `${helpers.slugify(settings.series[i])} wedge`)
                .attr("d", stackedArea)
                .on('mouseover', wedgeMouseover)                
                .on("mouseout", wedgeMouseout);


    //----------------------- 4. SERIES AND AXES LABELS ---------------------------//
        const seriesLength = charts[svgID].chartData.length

        // a. Wedge labels
        annotationGroup.selectAll(`#${svgID} .series-label`)
            .data(charts[svgID].data.slices.filter(d => Object.values(d)[0][0].value))      // Data filtered to only countries with values
            .join('text')
                .attr("class", d => helpers.slugify(Object.keys(d)[0])+" series-label")
                .datum(d => { return {
                        id: Object.keys(d)[0],
                        data: Object.values(d)[0][Object.values(d)[0].length - 1]
                    } })
                .attr("transform", (d, i) => {
                    return `translate(${charts[svgID].scales.xScale(d.data.date) + 10 } ,  
                    ${charts[svgID].scales.yScale(charts[svgID].data.stackedData[i][seriesLength-1][0] + (charts[svgID].data.stackedData[i][seriesLength-1][1] - charts[svgID].data.stackedData[i][seriesLength-1][0])/2) + 5 })`
                })
                .attr("x", 0)
                .attr("dy", -2)
                .text( d => `${d.id}: ${charts[svgID].labelFormat.yFormat(d.data.value)} ${settings.axis.y.unit}`)
                .on('mouseover', wedgeMouseover)                
                .on("mouseout", wedgeMouseout);

        // b. Axes labels
        const yLabel = annotationGroup.append("g")
            .attr("class", "axis-label y-axis")
            .attr("transform", `translate(-${settings.dims.margin.left -10}, 0) rotate(-90)`)
        yLabel.append("text").classed('axis-label y', true)
            .attr("dy", ".75em")
            .text(settings.axis.y.label)

        const xLabel = annotationGroup.append("g")
            .attr("class", "axis-label y-axis")
            .attr("transform", `translate(${chartWidth}, ${chartHeight})`)
        xLabel.append("text").classed('axis-label x', true)
            .attr("dy", "50")
            .text(settings.axis.x.label)


    //---------------- 5.  ADD TOTALS LINE AND DOTS (IF SPECIFIED) -------------------//
        if(!settings.options.addTotalLine){  // Totals line added if specified in the charts settings configuration
            // Set chart series and scales
            const lines = lineGroup.selectAll(".line")
                .data(charts[svgID].data.seriesTotal)
                .join("path")
                    .attr("class", d => `${helpers.slugify(Object.keys(d)[0])} line`)
                    .attr("d", d => line(Object.values(d)[0]) )

            // Dots for data points
            const totalPoints = pointsGroup.selectAll(`#${svgID} g.series-point-group`)
                    .data(charts[svgID].data.seriesTotal)
                    .join("g")
                        .attr('class', d => helpers.slugify(Object.keys(d)[0])+' seriesTotal-points-group')

            totalPoints.selectAll(`#${svgID} .points-group`)
                .append('g').classed('linePoints-group', true)
                    .data(d => Object.values(d)[0])
                    .join("circle")
                        .attr("cx", d => charts[svgID].scales.xScale(d.date) )      
                        .attr("cy", d => charts[svgID].scales.yScale(d.value) )    
                        .attr("r", (d, i) =>  i < seriesLength - 1 ? 2.5 : 4)
                        .attr("class", "total-point")
                        .style("opacity", 1)
                        .on('mouseover', circleMouseover)
                        .on('mouseout', circleMouseout)

            // Totals label
            const totalLineLabel = annotationGroup.append("g").classed('totalLine-label-group', true),
                latestDatum = charts['chart-vic-export-materials'].data.seriesTotal[0].Total[charts['chart-vic-export-materials'].data.seriesTotal[0].Total.length-1]
            
            totalLineLabel.append('line').classed('leader-line', true)
                .attr('x1', charts[svgID].scales.xScale(latestDatum.date))
                .attr('y1', charts[svgID].scales.yScale(latestDatum.value) - 5)
                .attr('x2', charts[svgID].scales.xScale(latestDatum.date))
                .attr('y2', charts[svgID].scales.yScale(latestDatum.value) - 25)
            totalLineLabel.append('line').classed('leader-line', true)
                .attr('x1', charts[svgID].scales.xScale(latestDatum.date))
                .attr('y1', charts[svgID].scales.yScale(latestDatum.value) - 25)
                .attr('x2', charts[svgID].scales.xScale(latestDatum.date) + 5)
                .attr('y2', charts[svgID].scales.yScale(latestDatum.value) - 25)

            totalLineLabel.append('text') 
                .classed("total series-label", true)
                .attr("transform", (d, i) => `translate(${charts[svgID].scales.xScale(latestDatum.date) + 10 + settings.labelOffset[i].x} ,  ${charts[svgID].scales.yScale(latestDatum.value) - 20})` )
                .text(`Total: ${charts[svgID].labelFormat.yFormat(latestDatum.value)} ${settings.axis.y.unit}`)
        }


    //------- 6. ADD SERIES DATA CIRCLE POINTS (IF SPECIFIED) FOR MULTIPLES TRANSITION -----------//
        const points = pointsGroup.selectAll(`#${svgID} g.series-points-group`)
            .data(charts[svgID].data.slices)
            .join("g").attr('class', d=> helpers.slugify(Object.keys(d)[0])+' series-points-group')

        // points.selectAll("g.linePoints-group")
        //     .append('g').classed('linePoints-group', true)
        //         .data(d => Object.values(d)[0])
        //         .join("circle")
        //         .attr("cx", d => charts[svgID].scales.xScale(d.date) )      
        //         .attr("cy", d => charts[svgID].scales.yScale(d.value) )    
        //         .attr('r', (d, i) =>  i < seriesLength - 1 ? 2 : 3.5)
        //         .attr('class', 'point')
        //         .style("opacity", 1)


     //--------------------------- 7. EVENT LISTENERS -------------------------//
        function wedgeMouseover(d){
            const selection = d3.select(this),
                otherWedges = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.classList[0]).map(d => '.wedge.'+d),
                otherLabels =settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.classList[0]).map(d => '.series-label.'+d)
            d3.select('.series-label.'+this.classList[0]).style('font-weight', 'bold')            
            d3.selectAll(`${otherWedges.toString()} , ${otherLabels.toString()} , .lines-group, .all-points-group, .totalLine-label-group`)
                .classed('blur', true)
        }; // wedgeMouseover

        function wedgeMouseout(d){
            d3.selectAll('.series-label, .wedge, .lines-group, .all-points-group, .totalLine-label-group')
                .style('font-weight', null)  
                .classed('blur', false)  
        };  // wedgeMouseout

        function circleMouseover(d){
            const selection = d3.select(this),
                    otherSeries = settings.series.map(d => helpers.slugify(d)).filter(d => d !== this.parentNode.classList[0]).map(d => '.'+d),
                    xLabel = charts[svgID].labelFormat.xFormat(charts[svgID].data.seriesData[+this.getAttribute('index')].date)
                charts.tooltip.transition()
                    .delay(30)
                    .duration(200)
                    .style("opacity", 1);
                charts.tooltip.html(`<div class="tooltip-x">${xLabel}</div> 
                            <div class="tooltip-y">${charts[svgID].labelFormat.yFormat(d.value)} ${settings.axis.y.unit}</div>`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 35) + "px");
                selection.transition()
                    .delay(0)
                    .duration(50)
                    .attr("r", 6)
                    .style("opacity", 1)
                d3.select('.series-label.'+this.parentNode.classList[0])
                    .style('font-weight', 'bold')            
                d3.selectAll(`${otherSeries.toString()}, .totalLine-label-group`).classed('blur', true)
        };  // circleMouseover      

        function circleMouseout(d){
            const selection = d3.select(this),
                seriesClassSelector = settings.series.map(d => '.'+helpers.slugify(d)).toString()
            charts.tooltip.transition()        
                .duration(100)      
                .style("opacity", 0);  
            selection
                .transition()
                .delay(20)
                .duration(200)
                .attr("r", 2.5)
                .style("opacity", null);
            d3.select('.series-label.'+this.parentNode.classList[0])
                .style('font-weight', null)    
            d3.selectAll(`${seriesClassSelector}, .totalLine-label-group`).classed('blur', false)
        }; // circleMouseout  


    //------------------------ 8 . SVG TOGGLE BUTTON -----------------------//   
        if(document.getElementById(svgID)){
            const parentContainer = document.getElementById(svgID).parentElement,
                parentID = parentContainer.id,
                chartSelectorContainer = d3.select('#'+parentID).append('div').classed('chart-selector-container', true),
                onOffSwitch = chartSelectorContainer.append('div').classed('onoffswitch layer-chart', true),
                input = onOffSwitch.append('input')
                            .attr('id', svgID+'-chartview-switch')
                            .classed('onoffswitch-checkbox', true) 
                            .attr('type', 'checkbox') 
                            .attr('name', 'onoffswitch') 
                            .attr('tabindex', 0) 
                            .attr('checked', true) 
                            .on('click',  () => charts.layer.methods.toggleMultiples(svgID) ),
                labelContainer = onOffSwitch.append('label')
                            .classed('onoffswitch-label', true) 
                            .attr('for', `${svgID}-chartview-switch`)

            labelContainer.append('span').classed('onoffswitch-inner', true)
            labelContainer.append('span').classed('onoffswitch-switch', true)
        }

}; // end renderMultiGroupLayerChart()



charts.line.methods.updateMultiGroupLayerChart = (selector, svgID, settings) =>{
    const group = selector.value, duration = 2000
    console.log(`Update to ${group} for ${svgID}`)
    console.log(charts[svgID])
    console.log(charts[svgID].data[group])
    //------------------------------- 0. UPDATE CHART DATA ---------------------------------//
        // a. Set current state and chart data
        charts[svgID].state.dataGroup = group
        charts[svgID].chartData =  charts[svgID].data[group]

        charts[svgID].chartData = charts[svgID].data[group].map(d => { 
            const newObj = {}
            Object.entries(d).forEach(([key, value]) => {
                if(settings.series.indexOf(key) > -1 || key === 'date' || key === 'year'){
                    newObj[key] = value
                }
            })
            return newObj
        }).filter(d => d.date >= helpers.numberParsers.parseDateSlash(settings.axis.x.start) && d.date  <= helpers.numberParsers.parseDateSlash(settings.axis.x.end) )

            // i. Series 'slices' data 
            settings.series.forEach(series => {
                charts[svgID].data.slices.push( {
                    [series]: charts[svgID].chartData.map(d => { 
                        return {
                            date:       d.date, 
                            value:      d[series],
                            key:        series
                        } 
                    })
                })
            })
            // ii. Series total line data
            charts[svgID].data.seriesTotal = [{
                Total: charts[svgID].chartData.map( d => {
                    let total = 0
                    settings.series.forEach(series => total += d[series])
                    return {
                        date:   d.date,
                        value:  total
                    }
                })
            }]
            // iii. Series stacked data
            charts[svgID].data.stackedData = d3.stack().keys(settings.series)(charts[svgID].chartData)


    //----------------------------- 2. SET UP SCALES AND AXES -----------------------------//
         // a. Setup scales (y axis)
        const extent = d3.extent(charts[svgID].chartData.map(d => Object.keys(d).filter(key => key !== 'date')
                                .reduce((obj, key) => {
                                    obj[key] = d[key];
                                    return obj;
                                }, {}))
                                .map(d => d3.sum(Object.values(d)))
        )
        // b. Update X and Y axis
console.log(extent)


        charts[svgID].scales.yScale.domain([extent]).nice()
        charts[svgID].axis.y = d3.axisLeft().scale(charts[svgID].scales.yScale)
        // c. Call transition to new axis 
        d3.select(`#${svgID} .axis.y-axis`)
            .transition().duration(duration)
            .call(charts[svgID].axis.y)

    //---------------------- 3. UPDATE LAYERS AND LINES-------------------------//
        const stackedArea = d3.area().curve(d3.curveMonotoneX) 
            .x( d => charts[svgID].scales.xScale(d.data.date))
            .y0( d => charts[svgID].scales.yScale(d[0]))
            .y1( d => charts[svgID].scales.yScale(d[1])) 

        const line = d3.line().curve(d3.curveMonotoneX) 
            .x(d => charts[svgID].scales.xScale(d.date)  )
            .y(d => charts[svgID].scales.yScale(d.value) )
console.log(charts[svgID].data.stackedData)            
        d3.selectAll(`#${svgID} .wedge`)
            .data(charts[svgID].data.stackedData)
            .join("path")
                .attr("class", (d, i) => `${helpers.slugify(settings.series[i])} wedge`)
                .transition().duration(duration)
                    .attr("d", stackedArea)



}; // end updateMultiGroupLayerChart()


charts.layer.methods.toggleMultiples = (svgID) => {
    // The approach here (to display multiples charts) is to:
    //  >> double the length of the current y scale and hide it from view - providing more space for the multiples charts that and; 
    //  >> transform each layer into its un-stacked shape (i.e. with its baseline back at zero on the y-axis)
    //  >> translate/move each multiples chart up sequentially, to be just above the previous layer.
    //  The reverse transformations are made to revert back to the layer chart

    //------------------ SETTINGS AND SHAPE GENERATORS -----------------------//
    const duration = 2000, 
        settings = charts[svgID].settings,  
        seriesLength = charts[svgID].data.seriesData.length,
        verticalGap = 25
    
    const line = d3.line().curve(d3.curveMonotoneX) 
        .x(d => charts[svgID].scales.xScale(d.date)  )
        .y(d => charts[svgID].scales.yScale(d.value) )
    const area = d3.area().curve(d3.curveMonotoneX) 
        .x(d => charts[svgID].scales.xScale(d.data.date))
        .y0( d => charts[svgID].scales.yScale(0))
        .y1( d => charts[svgID].scales.yScale(d[1] - d[0]))

    //---------------- 1. Go from stacked to multiples ----------------------//
    if( charts[svgID].state.layout === 'stacked' ){
        charts[svgID].state.layout = 'multiples'

        // i. Calculate multiples data for use in positioning and setting y scale
        seriesMax = charts[svgID].series.map( series => {
            return {
                name:   series, 
                value:  d3.max(charts[svgID].data.chartData.map(d => d[series]))
            }
        }),
        seriesMaxCum = [],
        seriesPosObj= {}
        seriesMax.forEach((obj, i, arr) => {
            seriesMaxCum.push({
                name:   obj.name, 
                value:   i === 0 ? 0 : seriesMaxCum[i-1].value + seriesMax[i-1].value
            })
        })
        seriesMaxCum.forEach(obj => seriesPosObj[obj.name] = obj.value)

        // ii. Change y scale and transition to area charts that are translated vertically as multiples
        charts[svgID].scales.yScale.domain([charts[svgID].scales.yScale.domain()[0], charts[svgID].scales.yScale.domain()[1] * 2])
        d3.selectAll(`#${svgID} .wedge`)
            .transition().duration(duration)
            .attr('d', area)
            .attr('transform', function(d, i){
                const index = charts['chart-vic-export-materials'].series.indexOf(d.key),       // Note index 'i' is not used as the series order appears to randomly jump. The calculated index is more robust
                    multiplesYOffset = -(charts[svgID].scales.yScale(0) - charts[svgID].scales.yScale(seriesPosObj[d.key]) + index * verticalGap) 
                return `translate(0, ${multiplesYOffset})` 
            })
        // iii. Fade the axes and totals lines out of view
        d3.selectAll(`#${svgID} .axis.y-axis, #${svgID} .lines-group, #${svgID} .all-points-group, .axis-label.y-axis, .totalLine-label-group`)
            .transition().duration(duration / 2)
            .style('opacity', 0)
            .style('pointer-events', 'none')

        // iv. Move the series labels 
        d3.selectAll(`#${svgID} .series-label:not(.total)`)
            .transition().duration(duration)
            .attr('transform', function(d, i){
                const index = charts['chart-vic-export-materials'].series.indexOf(d.id),       // Note index 'i' is not used as the series order appears to randomly jump. The calculated index is more robust
                multiplesYOffset = (charts[svgID].scales.yScale(seriesPosObj[d.id]) - ( index * verticalGap)) 
                return `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[i].x} , ${multiplesYOffset})` 
            })

    //---------------- 2. Go from stacked to multiples ----------------------//
    } else {
        charts[svgID].state.layout = 'stacked' 
        // i. Change scale and transition to area charts that are translated vertically as multiples
        charts[svgID].scales.yScale.domain([charts[svgID].scales.yScale.domain()[0], charts[svgID].scales.yScale.domain()[1] * 0.5])
        const stackedArea = d3.area().curve(d3.curveMonotoneX) 
                .x( d => charts[svgID].scales.xScale(d.data.date))
                .y0( d => charts[svgID].scales.yScale(d[0]))
                .y1( d => charts[svgID].scales.yScale(d[1])) 

        d3.selectAll(`#${svgID} .wedge`)
            .transition().duration(duration)
            .attr("d", stackedArea)
            .attr('transform', `translate(0, 0)`)

        // ii. Fade the axes and totals lines out of view
        d3.selectAll(`#${svgID} .axis.y-axis, #${svgID} .lines-group, #${svgID} .all-points-group, .axis-label.y-axis, .totalLine-label-group`)
            .transition().duration(duration).delay(duration / 2)
            .style('opacity', null)
            .style('pointer-events', 'auto')

        // iv. Move the series labels 
        d3.selectAll(`#${svgID} .series-label:not(.total)`)
            .transition().duration(duration)
            .attr("transform", (d, i) => {
                const index = charts['chart-vic-export-materials'].series.indexOf(d.id),       // Note index 'i' is not used as the series order appears to randomly jump. The calculated index is more robust
                    datum = charts[svgID].data.stackedData[index][seriesLength-1]
                return `translate(${charts[svgID].scales.xScale(d.data.date) + 10 + settings.labelOffset[index].x} , 
                                 ${charts[svgID].scales.yScale(datum[0]  + (datum[1] - datum[0])/2) + 5 + settings.labelOffset[i].y})` 
            })
    }
}; // end toggleMultiples()




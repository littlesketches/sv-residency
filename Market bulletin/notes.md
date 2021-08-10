

#CHART RENDERING STEPS

1. Load data
- General loader function is called that switches between data sources
- Only the Google Sheet loader (using tabletop.js) is currently active

2. Parse data
- To the correct number formats and stored in local object

3. Analyse and Transform data
- Done within the charting function 
- Includes finding data extents for setting scales
- Calculation of summary metrics for annotation


4. Render the chart visualisation
- 

5. Add interactions (tooltips)

5. 


Additional feaures



#CALLING A CHART (HTML)
1. An optional query string can be included to set certain parameters for a chart. This includes
- 'endMonth' : defaults to the latest month in the dataset
- 'noMonths': defaults to 12


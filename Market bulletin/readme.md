# MARKET BULLETIN DATA GRAPHICS
## TL;DR
- Go [here](https://sv-data-projects.github.io/market-bulletin-graphics/) to view graphics.
- Go [here](https://docs.google.com/spreadsheets/u/1/d/1rg66KhwEbN_FhpD0hhdd6SMIb9ApKlxh_93N4y9Qx_s/) to edit data.
- Go [here]((#visualisation-options-and-link-generation-guide)) down to custom queries for how to modify graphics with query strings.
- You are in the right place if you're trying to edit code.

&nbsp;
## About the waste annual reports graphics
This repository contains web-based data visualisations created for use SV in a series of **Annual Waste Reports**. The original development of these graphics took place in 2021 by Brendan of [Little Sketches](http://littlesketch.es/)... so if something code-related breaks contact brendan@littlesketch.es.
It is hoped that over time however, these graphics can be updated by other contributors via code changes managed in this repo. 

> **Reminder** 
>
> if changes are made, features added or new visualisations or methods added....**don't forget to update this documentation!**

&nbsp;
## Known bugs and to do's
None

&nbsp;
***
&nbsp;
## **CONTENTS**
**General information**
- [**How web based graphics work**](#how-web-based-graphics-work)
    - [A guide for context and not a 'how to'](#a-guide-for-context-and-not-a-how-to)
    - [Using the web browser for rendering graphics](#using-the-web-browser-for-rendering-graphics)
    - [Data driven graphics:connecting to editable data sources](#data-driven-graphics-connecting-to-editable-data-sources)
    - [Using JavaScript for creating visualisation layouts](#using-javascript-to-create-visualisation-layouts)
    - [Using CSS for styling (where possible)](#using-css-for-styling-where-possible)
    - [Using plain SVG for illustration layers](#using-plain-svg-for-illustration-layers)
- [**How to use these graphics in different mediums**](#how-to-use-these-graphics-in-different-mediums)
    - [i. Published web links (for viewing and embedding)](#i-published-web-links-for-viewing-and-embedding)
    - [ii. Exporting vector graphics for designed print publications](#ii-exporting-vector-graphics-for-print-design-publications)
    - [iii. Creating raster image files for MS documents (Word and PowerPoint)](#iii-creating-raster-image-files-for-ms-documents-word-and-powerpoint)
    - [iv. Embedding (iframe) on the SV website (or other web applications)](#iv-embedding-iframe-on-the-sv-website-or-other-web-applications)

**Developer information**
&nbsp;
- [**How the market bulletin code is structured**](#how-the-market-bulletin-code-is-structured)
    - [The Market Bulletin 'app suite'](#the-market-bulletin-app-suite)
        - [i. Time series charts](#i-time-series-charts)
        - [ii. Materials dashboard](#ii-materials-dashboard)
        - [iii. Value chain price](#iii-value-chain-price)
        - [iv. Kerbside collection flows](#iv-kerbside-collection-flows-interactive-flow-graphic)
        - [v. End market capacity 'heatmap' tables](#v-end-market-capacity-heatmap-tables)
        - [vi. Bin composition graphic (draft)](#vi-bin-composition-graphic-draft)

**Reference information**
&nbsp;
- [**Visualisation options and link generation guidance**](#visualisation-options-and-link-generation-guidance)
    - [Using query strings for setting visualisation options](#using-query-strings-for-setting-visualisation-options)
    - [Market Bulletin graphics link information by 'section'](#market-bulletin-graphics-link-information-by-section)
        - [i. Market Overview: embedded data visualisations (6)](#i-market-overview-embedded-data-visualisations-6)
        - [ii. Paper and paperboard section: data visualisations (6)](#ii-paper-and-paperboard-section-data-visualisations-6)
        - [iii. Plastics section: data visualisations (6)](#iii-plastics-section-data-visualisations-6)
        - [iv. Glass section: data visualisations (6)](#iv-glass-section-data-visualisations-6)
        - [v. Metals section: data visualisations (6)](#v-metals-section-data-visualisations-6)



&nbsp;
***
&nbsp;
# HOW WEB BASED GRAPHICS WORK

## A guide for context and not a 'how to'
These notes provide as guidance to *help you understand how* (these) web-based data visualisations are made. They are **not** intended to be a 'how to' guide - this stuff gets quite complex - but will hopefully provide useful context for anyone trying to understand, modify and extend the code-base for these graphics. 

> These visulisations are *small web apps* that **do not use (or need) a [JavaScript framework](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks)**, but they do use JS libraries, most notably [D3.js](https://d3js.org/) as a general data/DOM manipulation and rendering tool.

&nbsp;

## Using the web browser for rendering graphics
Each visual is made with web native technologies ([HTML](https://developer.mozilla.org/en-US/docs/Glossary/HTML)/[JS](https://developer.mozilla.org/en-US/docs/Web/JavaScript)/[CSS](https://developer.mozilla.org/en-US/docs/Web/API/CSS)) and rendered on an individual HTML webpage (or the [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model), to be more specific). This means that each visualisation is published to its own URL that can be easily shared and embedded. 

Most complex graphics are render to an [SVG element](https://developer.mozilla.org/en-US/docs/Web/SVG) on the webpage. However other [HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) are used where the are appropriate: this includes grid and table-based graphics, and components such as navigation features like menus and buttons, or extensive annotations.

The combination of these technologies means that graphic outputs are always (resolution independent) **[vector graphics](https://www.adobe.com/au/creativecloud/design/discover/vector-file.html)** that are best exported as PDFs using the browser's print to PDF function (note: Google Chrome is recommended). Notes on conversion to raster graphics formats (g.g. JPG, PNG etc.) are provided below. 

&nbsp;

## Data driven graphics: connecting to editable data sources
Each data visualisation is connected to 'source data' to create visual marks and arrangements. This means that when data is updated in the source, or if the code is 'pointed' to another dataset the visual output will change. Another for way to display a different visual output is by changing a visualisations (pre-programmed) 'settings' (see the [Visualisation options](#visualisation-options) section)

> Data is currently 'hosted' as tab separated values files from a Google Sheets spreadsheet. 
> - The link to the current Google sheet is [here](https://docs.google.com/spreadsheets/d/1V5HL7zCHGETUCDT8-3ZiDm9XncmOTEo9WDSP1Xe3wd0/edit#gid=0). 
> - The reference URLs are contained either directly in each visualisation's script, or in the case of the Market Bulletin graphics, in a shared data URLs object in 'core' folder (as a single object to update).


Connections to these tables is made using the [D3.js library's](https://d3js.org/) [Fetch API-based](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) date loaders. This setup means that URL links can be easily switched over to more secure hosting arrangement in the future. The trade off is that the Google Sheet based files can be easily shared, accessed and updated without knowledge of a host database.

*Side note: Data as originally connected via the more convenient and full featured [Tabletop.js](https://github.com/jsoma/tabletop) library however this was deprecated alongside the Google Sheets API (v3 to v4) migration in early August, 2021. The [PapaParse.js](https://www.papaparse.com/) library was then successfully implemented but introduced a further dependency (alongside D3.js), and so D3.js as eventually used as the simplest solution with least library dependencies (as its generally used here for most data visualisations).*

## Using JavaScript to create visualisation layouts
Each data visualisation typically uses a combination of vanilla JavaScript and the [D3.js library](https://d3js.org/) to load and shape the data, before rendering the data-driven elements on screen as SVG. 

That is a relatively simple 'workflow' however D3 is a low level library with an imperative code-style. This generally leads to fairly lengthy and involved code-bases and is **generally only recommended** for highly customised data graphics. 

For basic charts, its much easier to use another library or application (a bunch of which are built on top on D3). The main advantage of D3 is that - as as low level API operating on web standard technologies (HTML/CSS/JS) - it is incredibly flexible and plays well with anything other web features and libraries. This means that visualisations can be just another (native) part of a larger web application. 

## Using CSS for styling (where possible)
As these visualisations use web standards, most of the styling is contained in [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) files and assigned to elements with with [CSS selectors](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors). This might not mean much to anyone that isn't familiar with CSS, but in short, it means that a **most of the colours and typographic styling can be found in the the CSS files**.

Colours are mostly referenced throughout the CSS using [CSS Variable names](https://developer.mozilla.org/en-US/docs/Web/CSS/--*). This is so that the data visualisation palette (including all Brand Guideline colours) can be controlled from one central **core.css** file. Updates and extensions to the colour palette should be done in this core stylesheet.

**The notable exception to using CSS is usually when data-driven styling is applied to SVG elements inline, through the D3.js code. In these cases, look for colour references in the JS code to update colours.**

## Using plain SVG for illustration layers
Some visualisations contain more illustrative graphic layers. These are SVG-based graphics and illustrations whose code is copied into HTML code (note: SVG is web-native HTML). This SVG code can be directly edited but for the most part, these illustration were created in a vector graphics editor, cleanup up in the [SVG OMG](https://jakearchibald.github.io/svgomg/) tool, and imported into the HTML code. 
Further (data vis) SVG is added over the top using JavaScript and [D3.js](https://d3js.org/) 

## A note on SVG (and general) accessibility
Best efforts have been made to make data visualisations accessible - particularly for screen readers and keyboard-only users. On the positive side, SVG text elements are natively accessible through the DOM, and both `Title` and `Description` tags have been programmatically added as children to main SVG elements, as well appropriate reference attributes and [WCAG ARIA roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles). However providing optimised accessed to data encoded in visual forms (e.g. charts) - through listed elements for screen readers - and for hovered tooltips, is limited (although as mentioned, visible key text elements can be reached). More effort could be done here (and to improve accessibility in general). The rationale for not going further (at this time) is simply a lack of time, and the expectation that some design implications would take an unreasonable amount of time to resolve.

For visual contrast accessibility, again best efforts have been made to reach the AA minium for text. Exceptions have been made in more illustrative graphics where (again), re-design efforts would take an unreasonable amount of time to resolve. See also, the [design proposal for extending and standardising the colour palette used for waste materials](https://docs.google.com/spreadsheets/u/1/d/1fLZHGZMFQR2Uky6g_XLiJ2T1a5aK5S29b-5Gr7N_9nY/edit#gid=918506449).

&nbsp;
***
&nbsp;

# HOW TO USE THESE GRAPHICS FOR DIFFERENT MEDIUMS
[Return to contents](#contents)
## i. Published web links (for viewing and embedding)
As these graphics are rendered in the browser, this repo has also published to [Github pages](https://pages.github.com/) so that they can be easily shared an embedded. In this way,  Github pages is used to as a convenient static web server for publishing these graphics, and can be used as links to embed graphics in other webpages and apps, including the SV CMS.

An HTML index page has also been added to the repo (index.html) that provides a user friendly single access point to all graphics [here](./index.html)

If (in the future) other hosting services are preferred, they can (most likely) be linked to this Github repo. 

&nbsp;
## ii. Exporting vector graphics for designed print publications
As mentioned, SVG and HTML based graphics export (via print to PDF) as vector graphic files. Vector files are generally the highest 'publication quality' format for data visualisation that can be embedded and/or further edited in publication software like Adobe Illustrator and InDesign, or Affinity Design and Publisher. [Inkscape](https://inkscape.org/) is also a (free) open source alternative for vector graphics.These software packages can also export in other common graphic file formats (e.g. PNG and JPG) from these software packages.

&nbsp;
## iii. Creating raster image files for MS documents (Word and PowerPoint)
For MS Word documents, embedding vector graphics is problematic on Windows based machines (at the time or writing, where embedding PDF is possible however they become rasterised when saved). This is not problem on Mac OS machines where MS Word and PowerPoint happily accept and vector PDF files. 

> The fallback for Windows users who don't have access to graphics software is to convert from PDF to PNG (as the preferable raster image format).

&nbsp;
## iv. Embedding (iframe) on the SV website (or other web applications)
Certain graphics have been designed to be embedded in another web page or application - most notably the SV CMS. To accommodate this embedding, each graphic is designed to be responsive and will stretch to the width of the browser page. This includes HTML text and spacing that is specified in [viewport width](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units) units so that it has the same resizing behaviour as SVG elements. 

> **Design considerations for the SV website:**
> - The current SV website has quite a narrow, centered content block. Data visualisations are embedded as into this content flow, meaning that they appear quite narrow on screen. Data visualisations intended for embedding on the SV website need to consider this limitation.
> - Every embedded data visualisation does also have a 'view full screen option': this allows some flexibility to design for full screen. 
> - The SV CMS requires that embedded graphics contain the [iframe resizer](https://github.com/davidjbradshaw/iframe-resizer) code snippet. This snipper is added as a CDN link to each graphic. All newly made graphics should be published with this snippet.   
> - The SV CMS embeds html based graphics using the "Advanced data visualisation (D3)" component that allows for any [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) to be specified. 

&nbsp;
***
&nbsp;

# HOW THE MARKET BULLETIN CODE IS STRUCTURED
[Return to contents](#contents)
The following is an outline of how the code for each  Market Bulletin visualisation application is structured. This section is written for those wanting to update the code and assumes some basic developer knowledge to be able to locate and understand the HTML/CSS/JS code.

> The best way to read code is to look through it. Extensive code comments have been included in all scripts to help describe the roles of each function and object. 

##  The Market Bulletin 'app suite'
There are six separate applications (contained in this repo in separate folders and published URL paths)that support the range of Market Bulletin graphics.  Each application is described below:

Each of these applications also loads the shared:
- ../core/js/core.js script file that contains a set of links to .tsv data tables
- ../core/css/core.css stylesheet that contains the Brand and data visualisation colour palettes and links to loaded fonts

***
## i. Time series charts
### a custom library for line, area and stacked area charts
`/time-series-charts`: This application (linked to each chart page from the path `js/main.js`) is a small custom chart library for line, area and stacked area time series charts. The charting methods are stored in an object in the global namespace called `chart`. 

- There are various chart methods provided to cater for each chart type.
- The charting methods accepts a configuration (settings) object as an argument that specifies both layout and data options for the chart (see code comments for more details). 
- Each specific chart has its on HTML page: these are specified for each material and chart series group (so that they can be more easily specified with their own URL)
- The configuration object is specified in the HTML page that calls the `chart.methods.xxx.xxx()` method from a `buildVis()` function that asynchronously calls a:
    - An `applyQuerySettings()` method that checks for and applies any chart settings sent via a query string
    - A `renderChart()` method that renders the chart to the SVG id(s) specified in the configuration object
    - The pages for  `/export.html` and `/destination.html` also include 'tab-like' material selectors whose interaction code resides  in the `script` section of the HTML page.

&nbsp;
## ii. Materials dashboard
### material price, export and flows volume performance tables
`/materials-dashboard`: This application renders a multi-page information dashboard for materials flows, prices and export volumes. Configuration options are also available that render only the materials, prices or export components of the dashboard - these are the main visualisations featured in the Market Bulletin ((i.e. they are designed to be embedded in the content flow).
- Separate .html pages are specified for each material and component  (so that they can be more easily specified with their own URL)
- The pages for  `/price.html`,  `/export.html` and `/destination.html` also include 'tab-like' material selectors whose interaction code resides  in the `script` section of the HTML page.

&nbsp;

## iii. Value chain price
### a Diagram for displaying an comparing sub-material prices
`/value-chain-price`: This application renders a collection simple value chain flow graphic (customised for each material) with positioned sub-material labels and prices (for a specified month). 
- The layout and placement of each value chain node and sub-material price label is configured in the `js/main.js` file (refer to the objects for `settings.geometry.chain` and `settings.geometry.price`). This is how the sub-material price label positions and the shape of each leader line can be altered 
- For sub-material price to appear in the value chain graphic, its "name" in the source data file must match the name in the `settings.geometry.price`object (i.e. **sub-material names are hard-coded in the JS code/data object to and need to be in sync with changes to the source data naming convention**). Mismatched names (or names simply missing from the `settings.geometry.price`object),  will mean that the sub-material price label is not displayed. This behaviour can be used to hide sub-material prices from appearing (e.g. either delete the column from the source data, or alter the name or remove the sub-material from the `settings.geometry.price`object - all will cause a naming mismatch.) 

&nbsp;
## iv. Kerbside collection flows
### an interactive waste flows graphic
`/kerbside-collection-flows`: This application renders a custom materials flow (sankey) graphic showing waste collection (by material) and destination (by type); as well as circularity links.
- There is only one application here (with page `index.html`) that includes tab-like stepper option for moving through 'stages' of the graphic.
- This is a highly bespoke visual that includes visual state transitions and management - please refer to the code comments for more details.  

&nbsp;
## v. End market capacity 'heatmap' tables
### a styled HTML to overcome the limitations of the CMS
`/market-capacity-tables`: This is a small application to translate qualitative assessment tables (entered in the Google Sheet / .tsv file) into a styled HTML table that can be embedded in the Market Bulletin. 
- This application is made because of the limitations of the SV CMS to display tables with coloured cells
- Refer to the `js/main.js` script file to edit/update any colour coding or assessment options.

&nbsp;
## vi. Bin composition graphic
### a general purpose 'draft' 
`/bin-composition`: This application renders a graphic of a bin with layers for different waste materials (and contamination), scaled by volume,
- This application was made for use 'in future' market bulletin version but did not have an adequate data or design brief. Accordingly while fully functional and designed as being 'as general purpose as possible', it should be treated as a draft until further clarification on its use and its data sources are made.
- As the context of use is unknown, this graphic contains no on screen selectors, however a query string for ?month=[mth-year] can be used to select the month of data to show.

&nbsp;


&nbsp;
# VISUALISATION OPTIONS AND LINK GENERATION GUIDANCE 
[Return to contents](#contents)

Market Bulletin graphics primarily designed to work as embedded visualise in the SV CMS. Most are interactive and will show more 'details on demand' (e.g. hovering over charts), however key information and data is designed to show as the default view. This accommodates for any users who may print the Bulletin (i.e. the core visualisations are suitable for static print publications.)

&nbsp;
## Using query strings for setting visualisation options
All Market Bulletin data visualisations have been developed to read in a [query string](https://en.wikipedia.org/wiki/Query_string) that is added to its URL.
### **Setting dates for charts and visualisations**
A primary use of query strings is to allow users to set the date and/or data range of a visualisation (e.g. the start and end date to show in a time series chart). This is a critical features of the Market Bulletin graphics which allows a user to specify the correct display date range for a chart, that will persist even when new(er) data is appended ot the source date. 

**For the Market Bulletin, this means that charts for previous editions will always display charts with the matching dates range (even though they share the same base URL as charts for all other editions)** 

> ### **How query strings work**
> Query strings are simply an specially formatted text string at the end of a URL, after a '?". You can think of a query string as sending a bunch of 'settings' for the data vis application to apply. This means that the application must first be setup to do something with query string it receives. The table below outlines what options are available for each graphic.
> You can read about how query strings are structure [here](https://en.wikipedia.org/wiki/Query_string#Structure). It'll only take a few seconds or minutes to work out. But another simple way to figure them out is to see an example: a visualisation might be setup to receive a 'year' parameter from a query string, in a financial year format like '2018-19'. It would  then use that 'specified year' to display the right data. 
> - The query string would be simply be **'?year=2018-19'** and the URL would look something like www.xxxx.com/vis.html?**year=2018-19**. 
> - Multiple parameters can be appended wih an '&'. So www.xxxx.com/vis.html**?year=2018-19&showGlass=false** would also send the value 'false' for the parameter 'showGlass'.
>
> Thats it!

&nbsp;

## Market Bulletin graphics link information by 'section'
In each Market Bulletin edition there are five sections (i.e. pages or 'entries' in Craft) that feature data graphics that need to be embedded (through the Craft CMS Advanced Data Visualisation (D3) component). Each data visualisation is created in Craft individually by supply a URL link in an [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe).

**All of the following data visualisations need to be created for each edition**, with the correct dates passed into each URLs query string. To help with organising these components (around 30 per edition), a naming convention to manage components into easily searchable dates in Craft is **strongly recommended** (e.g naming components as 'mb-[mmm]-[yy]-[vis-name]')

> **SOME TIPS AND REMINDERS**
> - **Remember to specify dates:** All links should be provided for embedding should have a query string with the 'to' date specified to match the edition date.
> - **'from' date is optional in time series charts:**. The 'from' (start) date for all time series charts is *highlighted in italics* because it can be treated as an *optional parameter*. If a from date is not specified, the chart will display the previous 12 months of data by default. The option is provided in cases (outside the Market Bulletin online publication) where a different time series length may be needed.
>
> - **Reminder about adding parameters:** In the following tables for materials section there are URLs where a query parameters are already used to specify a material. To add another parameter (e.g. 'end' date) parameter, remember to use the & (e.g. /by-material.html?material=Plastic**&end=Dec-2020**)  
> 
> - **Data visualisation links have the same pattern for each material:** The data visualisation structure and naming patterns are the same for each material section (tables ii to v below). Subsequent table (while repetitive) are provided for clarity and to demonstrate this pattern

&nbsp;
## i. Market Overview: embedded data visualisations (6)
| Title  | Suggested CMS component name | html filename | Query parameter name | Query parameter value format |  Query parameter default |  Query parameter description
| --- | --- | --- | --- |---| ---| ---|
| Victorian kerbside recovered resource flows | mb-[mmm]-[yy]-**flow-visualisation** | [/kerbside-collection/index.html](https://sv-data-projects.github.io/market-bulletin-graphics/kerbside-collection-flows/index.html) | to | mmm-yy |  Last month of the dataset | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Destination of collected kerbside waste (with materials selector) | mb-[mmm]-[yy]-**destination-all** | /time-series-charts/destination.html | to | mmm-yy |  Last month of the dataset | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Recovered kerbside waste in storage (all materials) | mb-[mmm]-[yy]-**storage-all** | /time-series-charts/storage-all.html | to | mmm-yy |  Last month of the dataset  | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Value chain material prices (with materials selector) | mb-[mmm]-[yy]-**price-value-chain-all** | /value-chain-price/all-materials.html | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Material price performance and trend data (with materials selector) | mb-[mmm]-[yy]-**price-performance-all**| /materials-dashboard/all-materials.html | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Exported recovered materials (with materials selector) | mb-[mmm]-[yy]-**export-chart-all**| /time-series-chart/export.html | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*

&nbsp;
## ii. Paper and paperboard section: data visualisations (6)
| Title  | Suggested CMS component name | html filename | Query parameter name | Query parameter value format |  Query parameter default |  Query parameter description
| --- | --- | --- | --- |---| ---| ---|
| Destination of kerbside paper and cardboard| mb-[mmm]-[yy]-**destination-paper-and-cardboard.html** | /time-series-charts/destination.html | to | mmm-yy |  Last month of the dataset | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| End market capacity | mb-[mmm]-[yy]-**end-market-table-paper-and-cardboard** | /market-capacity-tables/index.html?material=Paper%20and%20cardboard | date | mmm-yy | Last month of the dataset  | Month of year for table
| Value chain material prices | mb-[mmm]-[yy]-**price-value-chain-paper-and-cardboard** | /value-chain-price/by-material.html?material=Paper%20and%20cardboard  | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Material price performance and trend data  | mb-[mmm]-[yy]-**price-performance-paper-and-paperboard**| /materials-dashboard/price-by-material.html?material=Paper%20and%20cardboard | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Exported paper and cardboard | mb-[mmm]-[yy]-**export-chart-paper-and-paperboard**| /time-series-chart/export-paper-and-cardboard.html | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Paper and cardboard export data trends| mb-[mmm]-[yy]-**export-table-paper-and-cardboard**| /materials-dashboard/export-by-material.html?material=Paper%20and%20cardboard | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for

&nbsp;
## iii. Plastics section: data visualisations (6)
| Title  | Suggested CMS component name | html filename | Query parameter name | Query parameter value format |  Query parameter default |  Query parameter description
| --- | --- | --- | --- |---| ---| ---|
| Destination of kerbside plastics| mb-[mmm]-[yy]-**destination-plastics.html** | /time-series-charts/destination.html | to | mmm-yy |  Last month of the dataset | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| End market capacity | mb-[mmm]-[yy]-**end-market-table-plastics** | /market-capacity-tables/index.html?material=Plastics | date | mmm-yy | Last month of the dataset  | Month of year for table
| Value chain material prices | mb-[mmm]-[yy]-**price-value-chain-plastics** | /value-chain-price/by-material.html?material=Plastics  | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Material price performance and trend data  | mb-[mmm]-[yy]-**price-performance-plastics**| /materials-dashboard/price-by-material.html?material=Plastics| date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Exported plastics | mb-[mmm]-[yy]-**export-chart-plastics**| /time-series-chart/export-plastics.html | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Plastics export data trends| mb-[mmm]-[yy]-**export-table-plastics**| /materials-dashboard/export-by-material.html?material=Plastics | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for

&nbsp;
## iv. Glass section: data visualisations (6)
| Title  | Suggested CMS component name | html filename | Query parameter name | Query parameter value format |  Query parameter default |  Query parameter description
| --- | --- | --- | --- |---| ---| ---|
| Destination of kerbside glass| mb-[mmm]-[yy]-**destination-glass.html** | /time-series-charts/destination.html | to | mmm-yy |  Last month of the dataset | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| End market capacity | mb-[mmm]-[yy]-**end-market-table-glass** | /market-capacity-tables/index.html?material=Glass | date | mmm-yy | Last month of the dataset  | Month of year for table
| Value chain material prices | mb-[mmm]-[yy]-**price-value-chain-glass** | /value-chain-price/by-material.html?material=Glass  | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Material price performance and trend data  | mb-[mmm]-[yy]-**price-performance-glass**| /materials-dashboard/price-by-material.html?material=Glass| date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Exported glas | mb-[mmm]-[yy]-**export-chart-glass**| /time-series-chart/export-glass.html | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Glass export data trends| mb-[mmm]-[yy]-**export-table-glass**| /materials-dashboard/export-by-material.html?material=Glass | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for

&nbsp;
## v. Metals section: data visualisations (6)
| Title  | Suggested CMS component name | html filename | Query parameter name | Query parameter value format |  Query parameter default |  Query parameter description
| --- | --- | --- | --- |---| ---| ---|
| Destination of kerbside metals| mb-[mmm]-[yy]-**destination-metals.html** | /time-series-charts/destination.html | to | mmm-yy |  Last month of the dataset | Month of year for chart to finish
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| End market capacity | mb-[mmm]-[yy]-**end-market-table-metals** | /market-capacity-tables/index.html?material=Metals | date | mmm-yy | Last month of the dataset  | Month of year for table
| Value chain material prices | mb-[mmm]-[yy]-**price-value-chain-metals** | /value-chain-price/by-material.html?material=Metals  | date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Material price performance and trend data  | mb-[mmm]-[yy]-**price-performance-metals**| /materials-dashboard/price-by-material.html?material=Metals| date | mmm-yy | *Last month of the dataset* |  Month of year to display prices for
| Exported glas | mb-[mmm]-[yy]-**export-chart-metals**| /time-series-chart/export-metals.html | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for
| | | | *from* | *mmm-yy* | *12 months prior to end date* |  *Month of year for chart to start*
| Metals export data trends| mb-[mmm]-[yy]-**export-table-metals**| /materials-dashboard/export-by-material.html?material=Metals | to | mmm-yy | *Last month of the dataset* |  Month of year to display data for


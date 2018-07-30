// fields in CSV file
var csvHeader = ["all_worker_ratio", "low_income_worker_ratio", "medium_income_worker_ratio", "high_income_worker_ratio"]; 
// default displaying field
var expressed = csvHeader[0];
var homeCity_jurisdiction_lowercase = null;


// retrieve home jurisdiction name in lowercase
$('#pageSubmenu li').on('click', function () {

    // remove any existing choropleth map and donut chart blank divs (before user's click)
    d3.select("svg.choropleth_map").remove();
    d3.select("div#incomeDonut").select("svg").remove();
    d3.select("div#industryDonut").select("svg").remove();
    var homeCity = null;
    
    var $el = $(this);
    var home_jurisdiction_lowercase = $el.attr("data-value");
    homeCity_jurisdiction_lowercase = home_jurisdiction_lowercase;

    // update choropleth map titles
    $('#mapTitle').text("Home-Based Work Trip Distribution of Workers Living in " + $el.text() + ", CA");



    window.onload = initialize();


    function initialize() {
        setMap();
    };


    function setMap() {

        var width = 960;
        var height = 600;
        
        // set width and height for map
        var map = d3.select("div#map")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "choropleth_map");
        
        var donutMargin = {top: 20, right: 20, bottom: 20, left: 20};
        var donutWidth = 960 - donutMargin.left - donutMargin.right;
        var donutHeight = 600 - donutMargin.top - donutMargin.bottom;
        var radius = Math.min(donutWidth, donutHeight) / 4; 

        var incomeDonut = d3.select("div#incomeDonut")
            .append("svg");
        
        var industryDonut = d3.select("div#industryDonut")
            .append("svg");
        
        // color range
        var donut_color = d3.scaleOrdinal(d3["schemeSet3"])
        
        // define projection, scale, center, and translate
        var projection = d3.geoMercator()
            .scale(8500)
            .center([-118.246524, 34.043701])
            .translate([width / 3.5, height / 1.85]);
        
        // create SVG path generator
        var path = d3.geoPath().projection(projection);
        var data_file = "/data/collection/" + homeCity_jurisdiction_lowercase + ".csv";

        d3.queue()
          .defer(d3.json, "/data/jurisdiction_geo.json")
          .defer(d3.json, "/data/county_geo.json")
          .defer(d3.csv, data_file)
          .await(ready);
        
        function ready(error, juris, cnty, csvData) {

            if (error) throw error;
            
            // define map color ramp (fixed for consistency)
            var color_domain = [0.1, 0.5, 1, 2, 5, 10, 20];
            var tripDistColor = d3.scaleThreshold()
                .domain(color_domain)
                .range(d3.schemeReds[9]);
            
            // jurisdiction geojson
            var jurisdiction = juris.features;
            // county geojson
            var county = cnty.features;
            
            // loop through values stored in CSV file and assign each csv record to jurisdiction geojson
            for (var i=0; i<csvData.length; i++) {
                var csvJurisdiction = csvData[i];
                var csvWorkCity = csvJurisdiction.work_city;
                // assign home city only once
                if (homeCity == null) {
                    homeCity = csvJurisdiction.home_city;
                }
                
                // loop through jurisdiction geojson to find matching jurisdiction by work_city/CITY field
                for (var a=0; a<jurisdiction.length; a++) {
                    // if work_city matches CITY, attach csv record to json jurisdiction
                    if (jurisdiction[a].properties.CITY == csvWorkCity) {
                        // assign 4 key/value pairs
                        for (var header in csvHeader) {
                            var attr = csvHeader[header];
                            var val = parseFloat(csvJurisdiction[attr]);
                            jurisdiction[a].properties[attr] = val;
                        };
                        // when found match, stop looking through the rest of geojson jurisdictions
                        break;
                    };
                }; // end of jurisdiction for-loop
            }; // end of csv for-loop
            
            var jurisdictions = map.append("g")
                .attr("class", "jurisdictions")
                .selectAll(".jurisdictions")
                .data(jurisdiction)
                .enter()
                .append("path")
                .attr("class", "jurisdictions_path")
                .style("opacity", 0.8)
                .style("fill", function(d) {
                    return choropleth(d, colorScale());
                })
                .attr("d", path)
                // display label
                .on("mouseover", function(d) {
                    var xPosition = d3.mouse(this)[0];
                    var yPosition = d3.mouse(this)[1] - 10;
                    map.append("text")
                        .attr("id", "tooltip")
                        .attr("x", xPosition + "px")
                        .attr("y", yPosition + "px")
                        .attr("text-anchor", "middle")
                        .attr("font-family", "sans-serif")
                        .attr("font-size", "12px")
                        .attr("font-weight", "bold")
                        .attr("fill", "black")
                        .text(
                            d.properties.CITY + ": " + parseFloat(d.properties[expressed]).toFixed(2) + "%"
                        )
                }) // end of mouseover event
                // remove label
                .on("mouseout", function(d) {
                    d3.select("#tooltip").remove();
                })
                // click event listener 
                .on("click", function (wacCity) {

                    // remove existing donut charts first
                    d3.select("g.incomeDonut").remove();
                    d3.select("g.industryDonut").remove();
                    d3.select("text.incomeDonutTitle").remove();
                    d3.select("text.industryDonutTitle").remove();
                    
                    // create arcs before creating donuts
                    var incomeArc = d3.arc()
                        .outerRadius(radius - 10)
                        .innerRadius(radius - 70);
                    
                    var industryArc = d3.arc()
                        .outerRadius(radius - 10)
                        .innerRadius(radius - 70);
                    
                    // create arc for label position
                    var labelArc = d3.arc()
                        .outerRadius(radius - 40)
                        .innerRadius(radius - 40);
                    
                    // generate donut charts
                    var pie = d3.pie()
                                .sort(null)
                                .value(function(e) { return e.income_ratio; });

                    var pie2 = d3.pie()
                                 .sort(null)
                                 .value(function(e) { return e.industry_ratio; });
                    
                    // define the svg donut charts
                    incomeDonut
                        .attr("width", donutWidth / 2)
                        .attr("height", donutHeight / 2)
                        .append("g")
                        .attr("class", "incomeDonut")
                        .attr("transform", "translate(" + donutWidth / 4 + "," + donutHeight / 4 + ")");

                    industryDonut 
                        .attr("width", donutWidth / 2)
                        .attr("height", donutHeight / 2)
                        .append("g")
                        .attr("class", "industryDonut")
                        .attr("transform", "translate(" + donutWidth / 4 + "," + donutHeight / 4 + ")");
                        

                    // read Work Area Characteristics (WAC) data
                    d3.csv("/data/wac.csv", function(error, wac_data) {
                        
                        if (error) throw error;
                        
                        wac_data.forEach(function (e) {
                            e.work_city = e.work_city;
                            e.income_category = e.income_category;
                            e.income_ratio = +e.income_ratio;
                            e.industry_category = e.industry_category;
                            e.industry_ratio = + e.industry_ratio;
                        });
                        
                        // filter records that match work city name
                        wac_data = wac_data.filter(e => e.work_city == wacCity.properties.CITY);
                        
                        // income donut 
                        // add a title
                        incomeDonut
                            .append("text")
                            .attr("class", "incomeDonutTitle")
                            .attr("x", donutWidth / 4)
                            .attr("y", donutHeight / 4)
                            .attr("text-anchor", "middle")
                            .text(wacCity.properties.CITY);
                        var g = incomeDonut.selectAll("g.incomeDonut")
                                .selectAll(".incomeArc")
                                .data(pie(wac_data))
                                .enter();
                        // append donut chart
                        g.append("path")
                         .attr("class", "incomeArc")
                         .attr("d", incomeArc)
                         .style("fill", function(e) { return donut_color(e.data.income_category); })
                         // transition effect
                         .transition()
                         .ease(d3.easeLinear)
                         .duration(500)
                         .attrTween("d", tweenIncomeDonut);
                        // attach donut text
                        g.append("text")
                         .attr("class", "incomeText")
                         // transition effect
                         .transition()
                         .ease(d3.easeLinear)
                         .duration(500)
                         .attr("transform", function(e) { return "translate(" + labelArc.centroid(e) + ")"; })
                         .attr("dy", ".35em")
                         .text(function(e) { return e.data.income_category + ": " + parseFloat(e.data.income_ratio).toFixed(0) + "%"; });
                         
                        
                        // industry donut 
                        // add a title
                        industryDonut
                            .append("text")
                            .attr("class", "industryDonutTitle")
                            .attr("x", donutWidth / 4)
                            .attr("y", donutHeight / 4)
                            .attr("text-anchor", "middle")
                            .text(wacCity.properties.CITY);
                        var g2 = industryDonut.selectAll("g.industryDonut")
                                .selectAll(".industryArc")
                                .data(pie2(wac_data))
                                .enter();
                        // append donut chart
                        g2.append("path")
                          .attr("class", "industryArc")
                          .attr("d", industryArc)
                          .style("fill", function(e) { return donut_color(e.data.industry_category); })
                          // transition effect
                          .transition()
                          .ease(d3.easeLinear)
                          .duration(500)
                          .attrTween("d", tweenIndustryDonut);
                        // attach donut text
                        g2.append("text")
                          .attr("class", "industryText")
                          // transition effect
                          .transition()
                          .ease(d3.easeLinear)
                          .duration(500)
                          .attr("transform", function(e) { return "translate(" + labelArc.centroid(e) + ")"; })
                          .attr("dy", ".35em")
                          .text(function(e) { return e.data.industry_category + ": " + parseFloat(e.data.industry_ratio).toFixed(0) + "%"; });
                        
                    });
                    
                    function tweenIncomeDonut(b) {
                        b.innerRadius = 0;
                        var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
                        return function(t) { return incomeArc(i(t)); };
                    }
                    
                    function tweenIndustryDonut(b) {
                        b.innerRadius = 0;
                        var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
                        return function(t) { return industryArc(i(t)); };
                    }

                });
            
            
            // plot county boundary
            map.append("g")
                .attr("class", "county_boundary")
                .selectAll(".county_boundary")
                .data(county)
                .enter()
                .append("path")
                .attr("class", "county_path")
                .attr("d", path);
            
            // plot home jurisdiction boundary with a slightly thicker line
            map.append("g")
               .append("path")
               .data(
                   jurisdiction.filter(function(d) { 
                    if (d.properties.CITY == homeCity) {return d.properties.CITY == homeCity; }})
                   )
               .attr("class", "home_jurisdiction_boundary")
               .attr("d", path);
                    
            createDropdown(csvData);
        
        }; // end of ready function
        
        // zoom with constraint
        var zoom = d3.zoom()
            .scaleExtent([1, 8])
            .translateExtent([[0,0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);
        
        map.attr("width", width)
           .attr("height", height)
           .call(zoom);
        
        function zoomed() {
            // zoom polygon and boundary together
            d3.select('svg.choropleth_map').select('g.jurisdictions').attr("transform", d3.event.transform);
            d3.select('svg.choropleth_map').select('path.home_jurisdiction_boundary').attr("transform", d3.event.transform);
            d3.select('svg.choropleth_map').select('g.county_boundary').attr("transform", d3.event.transform);
        }
        
        // add a legend
        var ext_color_domain = [0, 0.1, 0.5, 1, 2, 5, 10, 20];
        var legend_labels = ["< 0.1%", "0.1-0.5%", "0.5-1%", "1-2%", "2-5%", "5-10%", "10-20%", "> 20%"];
        
        var legend = map.selectAll("g.legend")
            .data(ext_color_domain)
            .enter()
            .append("g")
            .attr("class", "legend");
        
        var ls_w = 20, ls_h = 20;
        
        legend.append("rect")
              .attr("x", 20)
              .attr("y", function(d, i){ return height - (i*ls_h) - 2*ls_h;})
              .attr("width", ls_w)
              .attr("height", ls_h)
              .style("fill", function(d, i) { return pickColorScale(d); })
              .style("opacity", 0.8);
              
        legend.append("text")
            .attr("x", 50)
            .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4; })
            .text(function(d, i){ return legend_labels[i]; });
            
        legend.append("text")
            .text("Ratio of Workers Traveled")
            .attr('y', parseInt(legend.select('text').attr('y')) + 20);

    }; // end of setMap function


    // return color ramp
    function colorScale() {
        
        // define map color ramp (fixed for consistency)
        var color_domain = [0.1, 0.5, 1, 2, 5, 10, 20];
        var tripDistColor = d3.scaleThreshold()
                .domain(color_domain)
                .range(d3.schemeReds[9]);
        
        return tripDistColor;

    };


    // pick a color
    function pickColorScale(color) {
        
        var ramp = colorScale();
        return ramp(color);

    };


    // add a dropdown list
    function createDropdown(csvData) {
        
        var dropdown = d3.select("div#dropdown")
            .attr("class","dropdown")
            .html("<h5>Select Income Level: </h5>")
            .append("select")
            // listen to user event
            .on("change", function() {
                changeAttribute(this.value, csvData)
            })
        ;
        
        // create each option element within the dropdown
        dropdown.selectAll("options")
            .data(csvHeader)
            .enter()
            .append("option")
            .attr("value", function(d) { return d; })
            // format the option string in the dropdown list
            .text(function(d) {
                var textString = d.replace(/_/g, ' ');
                var textStringFormat = textString.toLowerCase().split(' ');
                for (var i = 0; i < textStringFormat.length; i++) {
                    textStringFormat[i] = textStringFormat[i].charAt(0).toUpperCase() + textStringFormat[i].substring(1);
                }
                return textStringFormat.join(' ');
            })
        ;
    };


    // re-paint the map based on user event listener
    function changeAttribute(attribute, csvData) {
        
        // change the expressed attribute
        expressed = attribute;
        // re-paint the map
        d3.selectAll("path.jurisdictions_path")
          .style("fill", function(d) {
              return choropleth(d, colorScale());
          });
        
    };


    // paint the map (including the default income level)
    function choropleth(d, recolorMap) {
        
        var value = d.properties[expressed];
        // if ratio is above 0, assign a color; otherwise assign transparent
        if (value) {
            return recolorMap(value);
        } else {
            return "transparent";
        };
    };


});

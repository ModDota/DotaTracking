/// <reference path="Scripts/d3/d3.js" />

var minValue = 0;
var maxValue = 0;

var topInfo = {}
function correctNames(mods) {
    newmods = []
    for (var i = 0; i < mods.length; i++) {
        newmods.push(correctName(mods[i]));
    }
    return newmods
}
function correctName(modName) {
    //return modName
    switch(modName) {
        case "Colosseum":
            return "Haunted Colosseum"
            break
        case "Epic boss fight (beta)":
        case "Epic boss fight (finaly fixed)":
        case "Epic Boss Fight (Custom lobby)":
            return "Epic boss fight"
            break
        case "GemTD - DIRETIDE":
            return "GemTD"
            break
        case "NavalWarfare - Open Beta v1.0.7":
        case "NavalWarfare - Open Beta v1.2.5":
        case "NavalWarfare - Open Beta v1.2.6":
        case "NavalWarfare - Open Beta v1.2.7":
        case "NavalWarfare - Open Beta v1.2.8":
            return "NavalWarfare - Open Beta"
            break
        case "For The King: Beacon Fire(Bless France)":
        case "For The King: Beacon Fire(RANK COMING)":
        case "For The King: Beacon Fire(Merry Christmas)":
            return "For The King: Beacon Fire"
            break
        case "Life In Arena":
            return "Life In Arena | Жизнь на Арене"
            break
        case "Realm of Chaos v1.3.2":
        case "Realm of Chaos v1.3.3":
        case "Realm of Chaos v1.3.5":
        case "Realm of Chaos v1.3.6":
        case "Realm of Chaos v1.3.8":
        case "Realm of Chaos v1.4.0":
        case "Realm of Chaos v1.4.2":
        case "Realm of Chaos v1.4.3":
        case "Realm of Chaos v1.4.5":
        case "Realm of Chaos v1.4.8":
        case "Realm of Chaos v1.5.7":
        case "Realm of Chaos v1.6.2":
        case "Realm of Chaos v1.6.5":
        case "Realm of Chaos v1.6.7":
        case "Realm of Chaos v1.6.8":
        case "Realm of Chaos v1.7.0":
            return "Realm of Chaos"
            break
        case "Guarding Athena BetaV1.1.3":
        case "Guarding Athena BetaV1.1.5":
        case "Guarding Athena BetaV1.1.6":
        case "Guarding Athena BetaV1.1.7":
        case "Guarding Athena BetaV1.1.8":
        case "Guarding Athena BetaV1.1.9":
            return "Guarding Athena Beta"
        default:
            return modName
    }
}
function renderEntry(modName) {
    var msg = "";
    var modEntry = topInfo[modName];
    if (modEntry.current) {
        msg += "<div class='current'>";
    }
    msg += "<span class='name'>" + modName + "</span> ";
    
    msg += "has been in the top10 <span class='count'>" + modEntry.count + "</span> times! ";
    
    msg += "(best position: <span class='position'>" +(modEntry.maxPosition+1)+ "</span>) ";
    
    msg += "(best streak: <span class='streak'>" +modEntry.maxStreak + "</span>)";
    
    msg += "((current streak: <span class='streak'>" + modEntry.currentStreak + "</span>))";
    if (modEntry["current"]) {
        msg += "</div>"
    }
    return msg;
}

d3.json("Data/DotaTracking.json", function (error, data) {
    console.log("Hello world?!");
    var parseDate = d3.time.format.utc("%Y:%m:%d_%H:%M:%S");
    
    var top10Dates = Object.keys(data["top10"]);
    top10Dates.sort(function(a,b) {
        a = parseDate.parse(a);
        b = parseDate.parse(b);
        return a.getTime() - b.getTime();
    });
    var streakInfo = [];
    for (var i = 0; i < top10Dates.length; i++) {
        var top10Entry = data["top10"][top10Dates[i]];
        var newStreakInfo = [];
        top10Entry.forEach(function(modName, position) {
            //console.log(streakInfo);
            modName = correctName(modName)
            if (modName in topInfo) {
                //We exist already, meaning we need to update old info
                topInfo[modName]["lastDate"] = top10Dates[i];
                topInfo[modName]["lastPosition"] = position;
                topInfo[modName]["count"]++;
                if (topInfo[modName]["maxPosition"] > position) {
                    topInfo[modName]["maxPosition"] = position; //We now know of a lower position (ie #2 known earlier, but we just found it being #1)
                }
                if (streakInfo.indexOf(modName) > -1) {
                    //console.log("We found ourselves in streakInfo?");
                    topInfo[modName]["currentStreak"]++; //Increment current streak, if it ever wasn't on the list, it would have been reset to 0
                    if (topInfo[modName]["maxStreak"] < topInfo[modName]["currentStreak"]) {
                        topInfo[modName]["maxStreak"] = topInfo[modName]["currentStreak"];
                    }
                } else {
                    topInfo[modName]["currentStreak"] = 1;
                }
            } else {
                //New entry!
                topInfo[modName] = {
                    "firstDate" : top10Dates[i],
                    "firstPosition" : position,
                    "lastDate" : top10Dates[i],
                    "lastPosition" : position,
                    "count" : 1,
                    "maxPosition" : position,
                    "currentStreak" : 1,
                    "maxStreak" : 1,
                    "graphInfo" : []
                }
            }
        });
        streakInfo = correctNames(top10Entry); //Override old streakInfo with "last iterations" data.
    }
    data["top10"][top10Dates[top10Dates.length-1]].forEach(function(modName, position) {
       topInfo[correctName(modName)]["current"] = true; 
    });
    
    Object.keys(topInfo).forEach(function(modName) {
        for (var i = 0; i < top10Dates.length; i++) {
            if (parseDate.parse(topInfo[modName].lastDate).getTime() < parseDate.parse(top10Dates[i]).getTime()) {
                //console.log("Line is over. Current date is " + top10Dates[i] + " but line ended at " + topInfo[modName].lastDate);
                break; //If this is hit, the line is over
            }
            if (parseDate.parse(topInfo[modName].firstDate).getTime() > parseDate.parse(top10Dates[i]).getTime()) {
                //console.log("Line hasn't started yet. Current date is " + top10Dates[i] + " but line starts at " + topInfo[modName].firstDate);
                continue; //If this is hit, the line hasn't started yet
            }
            topInfo[modName]["graphInfo"].push({
               "date" : parseDate.parse(top10Dates[i]),
               "position" : correctNames(data["top10"][top10Dates[i]]).indexOf(modName) > -1 ? correctNames(data["top10"][top10Dates[i]]).indexOf(modName) : null
            });
        }
    });
    
    
    //Now begins the line graph of awesomeness
    var colour = d3.scale.category10()
		.domain(Object.keys(topInfo));


    var margin = { top: 40, right: 50, bottom: 30, left: 100 },
		width = (top10Dates.length * 10) - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;
    
    var xScale = d3.time.scale()
		.domain(d3.extent(top10Dates, function(d) { return parseDate.parse(d);}))
		.range([0, width]);
    var yScale = d3.scale.linear()
		.domain([10, 1])
		.range([height, 0]);
    var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom")
		.tickSize(0, 0);
    var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient("left");

    var line = d3.svg.line()
        .defined(function(d) { return d.position != null; })
		.x(function (d) { return xScale(d.date); })
		.y(function (d) { return yScale(d.position + 1); })
		.interpolate("linear");
    
    // Define the div for the tooltip
    var tooltip = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);
    var svg = d3.select("body").append("svg")
        .attr("class", "graph")
	    .attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0, " + height + ")")
		.call(xAxis);
    svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Position");
            
    for (var i = 0; i < top10Dates.length; i++) {
        svg.append("line")
            .attr("class", "background_lines")
            .attr("x1", xScale(parseDate.parse(top10Dates[i])))
            .attr("x2", xScale(parseDate.parse(top10Dates[i])))
            .attr("y1", yScale(1))
            .attr("y2", yScale(10))
            .style("stroke-width", "3px")
            .style("stroke", "black")
            .style("opacity", "0.1")
    }        
    
    Object.keys(topInfo).forEach(function(modName) {
        var modInfo = topInfo[modName];
        
        var mouseOver = function(d) {
            tooltip.transition()		
                .duration(200)		
                .style("opacity", .9);		
            tooltip.html(modName + "<br/>")	
                .style("left", (d3.event.pageX) + "px")		
                .style("top", (d3.event.pageY - 28) + "px");
            svg.attr("class", "selected");
            d3.select(this).style("opacity", 1, "important");
        }
        var mouseOut = function(d) {		
            tooltip.transition()		
                .duration(500)		
                .style("opacity", 0);
            svg.attr("class", "graph");
            d3.select(this).style("opacity", null);
        }
        //console.log(modName);
        svg.append("path")
			.datum(modInfo.graphInfo)
			.attr("class", "line")
			.attr("d", line)
			.style("stroke", function (d) { return colour(modName); })
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut);
        svg.append("circle")
            .attr("class", "dot")
            .attr("cx", xScale(parseDate.parse(modInfo.firstDate)))
            .attr("cy", yScale(modInfo.firstPosition + 1))
            .attr("fill", function (d) { return colour(modName); })
            .attr("r", 3.5)
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut);
        svg.append("circle")
            .attr("class", "dot")
            .attr("cx", xScale(parseDate.parse(modInfo.lastDate)))
            .attr("cy", yScale(modInfo.lastPosition + 1))
            .attr("fill", function (d) { return colour(modName); })
            .attr("r", 3.5)
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut);
    });
    
    
    
    //Now begins the list of mods to ever make the list
    
    d3.select("body").append("p").html("There is <b>" +top10Dates.length+  "</b> Entries for Top10")
    var allList = d3.select("body").append("ol").selectAll("li")
        .data(Object.keys(topInfo).sort(function(a,b) {
            var modA = topInfo[a];
            var modB = topInfo[b];
            return modB.maxStreak - modA.maxStreak;
        }))
        .enter().append("li")
        .html(function(d) {
           return renderEntry(d);
        });
    
    var gotdTable = d3.select("body").append("table");
    
    var gotdTR = gotdTable.selectAll("tr")
        .data(Object.keys(data["gotd"]).sort(function(a,b) {
            a = parseDate.parse(a);
            b = parseDate.parse(b);
            return b.getTime() - a.getTime();
        })).enter()
        .append("tr");
    
    gotdTR.append("td").html(function(m) { return parseDate.parse(m).toUTCString();})
    gotdTR.append("td").html(function(m) { return data["gotd"][m];})
    
});

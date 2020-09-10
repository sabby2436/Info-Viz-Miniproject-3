'use-stict';
            let store = {}

            function loadData() {
                return Promise.all([
                    d3.csv("https://raw.githubusercontent.com/sabby2436/Dataset/master/aiddata.csv")
                ]).then(datasets => {
            
                    store.data = datasets[0];

                    return store;
                })
            }

            function processData(){

                function topFivePurpose(objectArray, property) {
                    let helper = {};
                    return objectArray.reduce(function (acc, obj) {
                        let key = obj[property];
                        if (!helper[key]) {
                            helper[key] = {
                                purposeCode : +obj.coalesced_purpose_code,
                                name : obj.coalesced_purpose_name,
                                commitment_amount_usd_constant: 0
                            }
                            acc.push(helper[key]);
                        }
                        helper[key]["commitment_amount_usd_constant"] += +obj.commitment_amount_usd_constant;
                        return acc;
                    }, []);

                }

                let topFiveP = topFivePurpose(store.data,"coalesced_purpose_code")
                topFiveP.sort((a,b)=>{return b.commitment_amount_usd_constant-a.commitment_amount_usd_constant})
                topFiveP = topFiveP.slice(0,5);         
                
                let topFiveCode = topFiveP.map((item)=>{
                    return item.purposeCode
                })
               
                let colors = ["#f0ff00", "#12e736", "#b000ff","#ff00a7","#00c5ff"]
                
                store["purpose"] = {};

                for(let i=0;i<5;i++){
                 
                    store["purpose"][topFiveP[i].purposeCode]={
                        ...topFiveP[i],...{color:colors[i]}
                    }
                }

                function groupByRecipientDonorPurpose(objectArray) {

                    let helper = {};

                    return objectArray.reduce(function (acc, obj) {
                        if( topFiveCode.includes(+obj.coalesced_purpose_code) ){
                            let key = obj.donor + '-' + obj.recipient + '-' + obj.coalesced_purpose_code;
                            if (!helper[key]) {
                                helper[key] = Object.assign({}, { 
                                    donor: obj.donor, 
                                    recipient: obj.recipient, 
                                    purpose: +obj.coalesced_purpose_code,
                                    totalAmount: +obj.commitment_amount_usd_constant
                                }); 
                                acc.push(helper[key]);
                            }else{
                                helper[key]["totalAmount"] += +obj.commitment_amount_usd_constant;
                            } 
                        }
                        return acc;

                    }, []);
                }

                function groupByRecipientDonor(objectArray) {

                    let helper = {};

                    return objectArray.reduce(function (acc, obj) {
                        let key = obj.donor + '-' + obj.recipient;

                        if (!helper[key]) {
                            helper[key] = Object.assign({}, { source: obj.donor, 
                                            target: obj.recipient, 
                                            purpose: [obj.purpose],
                                            totalAmount:obj.totalAmount
                                            }); 
                            acc.push(helper[key]);
                        } else {
                            helper[key]["purpose"].push(obj.purpose);
                            helper[key]["totalAmount"] += +obj.totalAmount;
                        }

                        return acc;

                    }, []);

                }

                function groupByCountries(objectArray, property) {
                    let helper = {};
                    return objectArray.reduce(function (acc, obj) {
                        let key = obj[property];
                        if (!helper[key]) {
                            helper[key] = Object.assign({}, {
                                node: obj[property],
                                amount:obj.totalAmount
                            })
                            acc.push(helper[key]);
                        }else{
                            helper[key]["amount"] += obj.totalAmount
                        }
                       
                        return acc;
                    }, []);
                }
                

                let recipientDonorPurpose = groupByRecipientDonorPurpose(store.data);
                store.data = groupByRecipientDonor(recipientDonorPurpose);

                store.recipients = groupByCountries(store.data, "target");
                store["recipients"].sort((a,b)=>{
                    return b.amount-a.amount
                })
                store["recipients"] = store["recipients"].slice(0, 10);

                store.donors = groupByCountries(store.data, "source");
                store["donors"].sort((a, b) => {
                    return b.amount - a.amount
                })
                store["donors"] = store["donors"].slice(0, 20);

               
            }

            function getChartConfig() {
                let margin = { top: 10, right: 350, bottom: 150, left: 160 },
                    width = 2000 - margin.left - margin.right,
                    height = 1400 - margin.top - margin.bottom;

                let container = d3.select("#Matrix")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                return { width, height, container, margin }
            }

            function getMatrixChartScale(config, countries) {

                let { height, width } = config;
                
                let yScale = d3.scalePoint()
                    .range([0, height])
                    .domain(store.donors
                        .map(d => d.node))
                    .padding(1)

                let xScale = d3.scalePoint()
                    .range([0, width])
                    .domain(store.recipients
                        .map(d => d.node))
                    .padding(1)


                return { yScale, xScale }

            }

            function drawMatrixChartAxis(config, scales) {

                let { yScale, xScale } = scales;

                let { container, height, width, margin } = config;

                let yAxis = d3.axisLeft(yScale);

                container.append("g")
                    .attr("class", "y axis")
                    .attr("class","axisWhite")
                    .style("font-size", "15px")
                    .style("fill","white")
                    .call(yAxis);

                container.append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - margin.left + 20)
                    .attr("x", 0 - (height / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .style("fill","white")
                    .text("Donor")
                    .style("fill","white")
                    .style("font-size", "20px");

                let xAxis = d3.axisBottom(xScale);

                container.append("g")
                    .attr("class", "x axis")
                    .attr("class","axisWhite")
                    .attr("transform", "translate(0," + height + ")")
                    .style("font-size", "15px")
                    
                    
                    .call(xAxis)
                    .selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.8em")
                    .attr("dy", ".15em")
                    .attr("transform", "rotate(-90)");

                container.append("text")
                    .attr("transform",
                        "translate(" + ((width) / 2) + " ," +
                        (height + margin.top + 120) + ")")
                    .style("text-anchor", "middle")
                    .style("font-size", "20px")
                    .text("Recipient")
                    .style("fill","white");
            }

            function drawMatrixChartPies(config, scales, processedData) {
                
                let { yScale, xScale } = scales;
                let { container, width, margin } = config;

                let arc = d3.arc()
                    .innerRadius(0)
                    .outerRadius(25);

                let points = container.selectAll("div")
                    .data(processedData)
                    .enter()
                    .append("g")
                    .attr("transform", function (d) { return "translate(" + [xScale(d.target), yScale(d.source)] + ")" })
                    .attr("class", "pies")

                let pie = d3.pie()
                    .value(function (d) { return d.piValue });

                let pies = points.selectAll(".pies")
                    .data(function (d) {
                        let piData = [];
                        d["purpose"].forEach((purpose) => {
                            let newObj = {
                                purpose: store.purpose[purpose],
                                piValue: 100 / d["purpose"].length
                            };
                            piData.push({ ...d, ...newObj })
                        })
                        return pie(piData);
                    })
                    .enter()
                    .append('g')

                pies.append("path")
                    .attr('d', arc)
                    .style("opacity", 0.8)
                    .attr("fill", (d, i) => { return d.data.purpose.color })

                let keys = []
                Object.keys(store.purpose).forEach((purpose) => {
                    keys.push(store.purpose[purpose])
                })

                container.selectAll("mylabels")
                    .data(keys)
                    .enter()
                    .append("circle")
                    .attr("cx", 100)
                    .attr("cy", function (d, i) { return 100 + i * 45 }) // 100 is where the first dot appears. 25 is the distance between dots
                    .attr("r", 15)
                    .style("fill", function (d) { return d.color })
                    .attr("transform", function (d, i) {
                        return "translate(" + (width - margin.left + 90) + "," + (-70) + ")";
                    });


                container.selectAll("mylabels")
                    .append('g')
                    .data(keys)
                    .enter()
                    .append("text")
                    .style("fill","white")
                    .attr("x", 120)
                    .attr("y", function (d, i) { return 100 + i * 45 }) // 100 is where the first dot appears. 25 is the distance between dots
                    .text(function (d) { return d.name })
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")
                    .attr("transform", function (d, i) {
                        return "translate(" + (width - margin.left + 90) + "," + (-70) + ")";
                    });

            }

            function drawGrid(config, scales) {
                let { container, height } = config;
                let { xScale } = scales;
                let { recipients } = store;

                recipients.forEach(item => {
                    container
                        .append("line")
                        .style("stroke", "black")
                        .style("stroke-dasharray", ("3, 3"))
                        .attr("y1", height)
                        .attr("y2", 0)
                        .attr("x1", xScale(item.node))
                        .attr("x2", xScale(item.node))
                })

            }
          
            function drawChart() {
                processData(); 
                let config = getChartConfig();
                let scales = getMatrixChartScale(config);
                drawGrid(config, scales);
                drawMatrixChartAxis(config, scales);
                drawMatrixChartPies(config, scales, store.data);
            }

            loadData().then(drawChart);
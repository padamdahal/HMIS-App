// Get the app manifest in order to determine the location of the API
$.getJSON('manifest.webapp').done(manifest => {
    console.info('Loading app resources');
	
	dhis2.period.format = 'yyyy-mm-dd';
    dhis2.period.calendar = $.calendars.instance('gregorian');
    dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );
	dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );
	
	// Get the server date
	var serverDate;
	$.getJSON('../../../api/system/info').done(systemInfo => {
		console.log('Server Date: '+systemInfo.serverDate.substring(0, 10));
		serverDate = systemInfo.serverDate.substring(0, 10);
	});
	
	var reportType = "reporting";
	
	// Select organization unit
	var ouId;
	var selectedOrgUnit;
	var selectedOrgUnitLevel;
	
	selection.setListenerFunction(function(e){
		selectedOrgUnit = e;
		var selectedOrgUnitName = document.getElementsByClassName("selected")[0].innerHTML;
		
		ouId = e[0];
		if(hmisOu.includes(ouId)){
			ouId = hmisAdditionalOu[hmisOu.indexOf(ouId)];
		}
		$.getJSON("../../../api/organisationUnits/"+ouId+".json", function(ouDetail) {
			var ouLevel = ouDetail.level;
			
			if(ouLevel <= 3){
				ouLevel = ouLevel+1
			}
			ouId = ouId+";LEVEL-"+(ouLevel);
			$("#selectedOrgUnit").html(selectedOrgUnitName);
			getReport(ouId, reportType);
		});
	});
	
	// Organization Unit search
	$("#searchField").autocomplete({
		source: "../../../dhis-web-commons/ouwt/getOrganisationUnitsByName.action",
		select: function(event,ui) {
			$("#searchField").val(ui.item.value);
			selection.findByName();
		}
	});
	
	function getReport(ouid, reportType){
		var dx;
		$.getJSON("config.json", function(configs) {
			//$("#visualization").empty();
			$(".card-body").empty();
			$(".card-body").html("<img src='pulse.gif' style='height:50px;margin:10px;' />");
			
			$.each(configs, function(key, config){
				var name = key;
				var config = config.config;
				$.getJSON("/hmisrest/covacdaily.php?type="+reportType+"&ou="+ouid+"&dx="+config.dx+"&pe="+config.pe, function(data) {
					
					/*var html = `<div class="`+config.cssClass+`" style="">
							<div class="card mb-4" style="margin-top:12px;margin-bottom:12px;border:1px solid #ccc;padding:3px;">
								<div class="card-body" id="`+name+`"></div>
							</div>
						</div>`;
					$("#visualization").append(html);*/
					
					var renderers = $.pivotUtilities.plotly_renderers[config.visualizationType];
					var width = $("body #"+name).width();
					var chartTitle = config.title;
					var sum = $.pivotUtilities.aggregatorTemplates.sum;
					var numberFormat = $.pivotUtilities.numberFormat;
					var intFormat = numberFormat({digitsAfterDecimal: 0});
					var aggregator;
					if(config.aggregator == "sum"){
						aggregator = sum(intFormat)(["Value"]);
					}else{
						aggregator = null;
					}
					
					$("#"+name).pivot(data, {
						rows: config.rows,
						cols: config.cols,
						renderer: renderers,
						aggregator: aggregator,
						rendererOptions: { plotly: {responsive:true, xaxis:config.xaxis, yaxis:config.yaxis, title:chartTitle}}
					});
				});
			});
		});
	}
	
}).fail(error => {
	console.warn('Failed to get manifest:', error);
});
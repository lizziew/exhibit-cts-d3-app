/*==================================================
 *  Simile Exhibit D3 Extension
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_D3Extension_isCompiled" in window) && 
                    window.Exhibit_D3Extension_isCompiled;
                    
    Exhibit.D3Extension = {
        params: {
            bundle: false 
        } 
    };

    var scriptName = "d3";

    var extensionName = "D3 extension";

    var javascriptFiles = [
        "d3-bar-chart-view.js",
        "d3-bubble-view.js",
        "d3-pie-chart-view.js",
        "d3-scatter-plot-view.js"
    ];

    var javascriptLibs = [
                          ];

    var cssFiles = [
        "bar.css",
        "bubble.css",
        "pie.css"
                    ];
    
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_D3Extension_urlPrefix == "string") {
        Exhibit.D3Extension.urlPrefix = Exhibit_D3Extension_urlPrefix;
        if ("Exhibit_D3Extension_parameters" in window) {
            Exhibit.parseURLParameters(Exhibit_D3Extension_parameters,
                                          Exhibit.D3Extension.params,
                                          paramTypes);
        }
    } else {
        var url = Exhibit.findScript(document, "/" + scriptName + "-extension.js");
        if (url == null) {
            Exhibit.Debug.exception(new Error("Failed to derive URL prefix for " + extensionName));
            return;
        }
        Exhibit.D3Extension.urlPrefix = url.substr(0, url.indexOf(scriptName + "-extension.js"));
        
        Exhibit.parseURLParameters(url, Exhibit.D3Extension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
    
    if (Exhibit.D3Extension.params.bundle) {
        scriptURLs.push(Exhibit.D3Extension.urlPrefix + scriptName + "-extension-bundle.js");
        cssURLs.push(Exhibit.D3Extension.urlPrefix + scriptName + "-bundle.css");
    } else {
        Exhibit.prefixURLs(scriptURLs, Exhibit.D3Extension.urlPrefix + "scripts/", javascriptFiles);
        Exhibit.prefixURLs(scriptURLs, Exhibit.D3Extension.urlPrefix + "lib/", javascriptLibs);
        Exhibit.prefixURLs(cssURLs, Exhibit.D3Extension.urlPrefix + "styles/", cssFiles);
    }

    
    for (var i = 0; i < Exhibit.locales.length; i++) {
        scriptURLs.push(Exhibit.D3Extension.urlPrefix + "locales/" + Exhibit.locales[i] + "/" + scriptName + "-locale.js");
    };
    
    if (!isCompiled) {
        Exhibit.includeJavascriptFiles("", scriptURLs, false);
        Exhibit.includeCssFiles(document, "", cssURLs);
    }
})();

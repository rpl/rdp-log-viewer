/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * (c) 2013 Luca Greco (ubik.cc)
 */

$(document).ready(function(){
    window.DATA = {
        "DIAGRAMDSL":
            "title: TITLE: How to use RDPLogViewer\n" +
            "participant User\nparticipant RDPLogViewer\n\n" +
            "User -> RDPLogViewer: open a log file (e.g. test-case1.json)\n" +
            "RDPLogViewer -> User: convert logs to diagram source and render diagram",
        "TITLE": "How to use RDPLogViewer",
        "JSON": [],
        "EDITOR": "editor-dsl"
    };

    document.querySelector("form").reset();
    var reader = new FileReader();
    var editor = CodeMirror.fromTextArea(document.querySelector("#diagram-source"));

    var render = function render() {
        $("#diagram").empty();
        $("#renderingModal").modal("show");
    };

    $(document).on("diagram:rendered", function() {
        $("#renderingModal").modal("hide");
    });

    $("#renderingModal").on("shown", function () {
        try {
            var diagram = Diagram.parse(window.DATA["DIAGRAMDSL"]);
            //console.log(diagram);
            var theme = $("#theme").val() || "fast" ;
            diagram.drawSVG('diagram', {theme: theme });
        } catch (e) {
            // TODO: REPORT ERRORS IN A MODAL
            console.log(e.toString());

        }
    });

    var switchEditor = function (mode) {
        window.DATA["EDITOR"] = mode;
        $("#editor-mode button").removeClass("active");
        $("#"+mode).addClass("active");

        if (mode == "editor-dsl") {
            $("#editor-container").show();
            editor.setValue(window.DATA["DIAGRAMDSL"]);
        } else if (mode == "editor-json") {
            $("#editor-container").show();
            editor.setValue(JSON.stringify(window.DATA["JSON"], null, 2));
        } else if (mode == "editor-hidden") {
            editor.setValue("");
            $("#editor-container").hide();
        }
    };

    $("#editor-mode button").on("click", function () {
        switchEditor(this.id);
        return false;
    });

    $('#parse').click(_.throttle(function() {
        switch(window.DATA["EDITOR"]) {
        case "editor-json":
            window.DATA["JSON"] = JSON.parse(editor.getValue());
            window.DATA["DIAGRAMDSL"] = logs2diagram(window.DATA["TITLE"],
                                                     window.DATA["JSON"]);
            break;
        case "editor-dsl":
            window.DATA["DIAGRAMDSL"] = editor.getValue();
            break;
        default:
        }
        render();
    }, 100));

    $('#input').on('change', function handleFiles() {
        var files = document.querySelector("#input").files;
        reader.onload = function(evt) {
            window.DATA["JSON"] = JSON.parse(evt.target.result);
            window.DATA["TITLE"] = files[0].name;
            window.DATA["DIAGRAMDSL"] = logs2diagram(window.DATA["TITLE"],
                                                     window.DATA["JSON"]);
            switchEditor("editor-json");
            editor.setValue(JSON.stringify(window.DATA["JSON"], null, 2));
            $("#theme").val("fast");
            render();
        };
        reader.readAsText(files[0], 'utf-8');
    });

    $("#save").click(function () {
        var svg = $("#diagram").find('svg')[0];
        var width = parseInt(svg.width.baseVal.value);
        var height = parseInt(svg.height.baseVal.value);
        var data = editor.getValue();
        var xml = '<?xml version="1.0" encoding="utf-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"><svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" xmlns:xlink="http://www.w3.org/1999/xlink">' + svg.innerHTML + '</svg>';
        var a = $(this);
        a.attr("download", "diagram.svg"); // TODO I could put title here
        a.attr("href", "data:image/svg+xml," + encodeURIComponent(xml));
    });


    $("#load-demo").click(_.throttle(function () {
        $.getJSON($("#demo").val()+".json").
            done(function(data) {
                window.DATA["JSON"] = data;
                window.DATA["TITLE"] = $("#demo").val();
                window.DATA["DIAGRAMDSL"] = logs2diagram(window.DATA["TITLE"],
                                                         window.DATA["JSON"]);
                switchEditor("editor-json");
                editor.setValue(JSON.stringify(window.DATA["JSON"], null, 2));
                $("#theme").val("fast");
                render();
            }).
            fail(function(res) { console.log( "error", res.statuText ); });
    }, 100));

    $("#about-close").click(function () { $("#aboutModal").modal('hide'); });
    $(".brand").click(_.throttle(function () {
        $("#aboutModal").modal("show");
    }, 100));
    $("#aboutModal").on("hidden", function() {
        if ($("#about-disabled")[0].checked) {
            localStorage.setItem("first-run-done", true);
        } else {
            localStorage.removeItem("first-run-done");
        }
    });

    $("#renderingModal").one("hidden", function() {
        if (!localStorage.getItem("first-run-done")) {
            $("#aboutModal").modal("show");
        }
    });

    // switch to editor-dsl and render "how to use sequence diagram" on load
    switchEditor("editor-dsl");
    render();
});

/* JSON TO DIAGRAMDSL CONVERSION HELPERS */

function logs2diagram(title, messages) {
    var lines = [
        "title: TITLE: " + title,
        "participant dbgserver",
        "participant dbgclient"
    ];

    var i = 1;

    messages.forEach(function (message) {
        var line = "";
        switch (message.direction) {
        case "send":
            line += "dbgclient -> dbgserver: (" + i + ")\n";
            line += "note right of dbgclient: (" + i + ")\\n";
            break;
        case "receive":
            line += "dbgserver -> dbgclient: (" + i + ")\n";
            line += "note left of dbgserver: (" + i + ")\\n";
            break;
        default:
            throw "Unknown RDP Message direction: " + message.direction;
        }

        line += JSON.stringify(message.packet, summary, 2).replace(/[\n]/g, '\\n');
        lines.push(line);
        i++;
    });

    return lines.join("\n");
}

function summary(key, value) {
    switch (typeof value) {
    case "string":
        if (value.length > 100) {
            value = "VERY LONG STRING...";
        }
        break;
    case "object":
    case "function":
    }

    return value;
}

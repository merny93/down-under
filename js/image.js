const html2canvas = require("html2canvas");

function doMagic() {
    html2canvas(document.getElementById("web-template")).then(function (canvas) {
        document.body.appendChild(canvas);
    });
}
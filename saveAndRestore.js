// this is used for things that should
// not fire too often
function debounce(func, wait, immediate) {
    var timeout;

    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}; 

// read in new tools; you can select one or more 
// raw svg file

// if we want to use the debounce use the following line and also 
// the change the last line of this function
var readNewFile = debounce(function() {
 
    var inputFileButton = document.getElementById('inputFileButton'); 
    var file = inputFileButton.files; // list of files that were selected by user
    var reader = []; // array to store the files in
    var myRawData = []; // array to store raw data in

    // go over all the selected files
    for (var i = 0; i < file.length; i++) { 

        // only select SVG files
        if (file[i].name.match('\.svg')) {

            // create an object to read the file into
            reader[i] = new FileReader();
            
            reader[i].onload =  function () {

                // store the new file into a path2D object
                var path = new Path2D(this.result);
         
                // make a tool out of this path
                var tool = new Tool("free");

                // read in all data
                myRawData=this.result.split(' ');
                
                // the first data in the file is the image offset        
                tool.imgOffset.push(parseFloat(myRawData[0]));
                tool.imgOffset.push(parseFloat(myRawData[1]));

                // next comes the convex hull
                var k=1;
                for (; k < myRawData.length; k++){
                    if (myRawData[2*k] == 'C')
                        break;
                    tool.convexhull.push([parseFloat(myRawData[2*k]), parseFloat(myRawData[2*k+1])]);
                };
                
                // next is the tool outline
                for (var j = k+1; j < (myRawData.length+1)/2; j++) {                    
                    tool.rawdata.push([parseFloat(myRawData[2*j-1]), parseFloat(myRawData[2*j])]);
                };            
        
                // make out of the original tool outline the edited data
                var allPointObjects = pointsConversion(tool.rawdata, 'toObject');
                // now do the smoothing: first do a lot of smoothing; 
                // this is reflected by the parameter 3
                var allPointObjectsSmooth = simplify(allPointObjects,3,true);
                tool.editeddata = pointsConversion(allPointObjectsSmooth, 'toArray');
                // look for the longest segment in this path
                var maxlength = 0;
                var maxindex;
                for (var j=1; j<tool.editeddata.length; j++) {
                    if ((newlength = Math.pow(tool.editeddata[j][0]-tool.editeddata[j-1][0], 2.0)+Math.pow(tool.editeddata[j][1]-tool.editeddata[j-1][1], 2.0))> maxlength) {
                        maxlength = Math.pow(tool.editeddata[j][0]-tool.editeddata[j-1][0], 2.0)+Math.pow(tool.editeddata[j][1]-tool.editeddata[j-1][1], 2.0);
                        maxindex = j-1;
                    }
                }

                // compute the best angle based on this
                //var angle = Math.acos(Math.abs((tool.rawdata[maxindex+1][0]-tool.rawdata[maxindex][0])/Math.sqrt(maxlength))) * 360/(2* Math.PI);
                var angle = Math.atan((tool.editeddata[maxindex+1][1]-tool.editeddata[maxindex][1])/(tool.editeddata[maxindex+1][0]-tool.editeddata[maxindex][0])) * 360/(2* Math.PI);
                tool.angle -= angle;

                // now do only some smoothing; this is what we will use for the path
                allPointObjectsSmooth = simplify(allPointObjects,0.75,true);

                // put the result into rawdata
                tool.editeddata = pointsConversion(allPointObjectsSmooth, 'toArray');

                // create a new path out of this
                var newString = "M ";
                for (var j=0; j<tool.editeddata.length; j++) {
                    newString+= tool.editeddata[j][0].toString() + " " + tool.editeddata[j][1].toString() + " ";
                }
  
                // put this path into the tool
                tool.path = new Path2D(newString);

                // put filename in tool object
                tool.filename = this.fileName.slice(0,-4);

                // compute the average; this is used as center
                var avgX=0;
                var avgY=0;
                for (var j = 0; j < tool.editeddata.length; j++) {
                    avgX+=tool.editeddata[j][0];
                    avgY+=tool.editeddata[j][1];
                }
                tool.avgX = avgX/tool.editeddata.length;
                tool.avgY = avgY/tool.editeddata.length;

                // choose the offset randomly in such a way that we get a uniform distribution over all
                // positions such that the bounding box is entirely in the canvas
                computeBoundingBox(tool);
                tool.offsetX = Math.random()*(document.getElementById('myCanvasWidth').value-tool.maxX+tool.minX)-tool.avgX-tool.minX;
                tool.offsetY = Math.random()*(document.getElementById('myCanvasHeight').value-tool.maxY+tool.minY)-tool.avgY-tool.minY;
                
                // find a good placement of the handle
                tool.handleCenterX = tool.avgX;
                tool.handleCenterY = tool.avgY;
                findClosestHandleCenter(tool);

                // attach this tool to the list of tools
                regularCanvas.allTools.push(tool);   
                
                // push this action also onto the undo stack
                // no need to push the tool itself onto this stack
                pushOntoUndoStack(regularCanvas.allTools.length-1, "c", false, true);
            }  

            // read that file
            reader[i].fileName = file[i].name;
            reader[i].readAsText(file[i]);
        }
        else {            
            Alert("File not supported!");
        }
    }


    // plot all tools
    regularPlot();


}, 50);

// when the ``disc'' icon is pressed the current "state"
// of the whole canvas is written as a text string onto a file
// this file can be downloaded via the browser and by loading
// the same file the state of the whole canvas can be restored later
var saveCanvasFunction = function() {

    // create a string to store the whole state
    var myString = "";

    // start with canvas size, units, and magnification
    
    myString += String(regularCanvas.width)
    myString += "   # canvas width # \n";
    myString += String(regularCanvas.height);
    myString += "   # canvas height # \n";
    myString += String(regularCanvas.unitsinmm);
    myString += "   # units # \n";
    myString += String(regularCanvas.magnification);
    myString += "   # magnification # \n";
    myString += String(regularCanvas.allTools.length);
    myString += "   # number of tools # \n";

    // go over all tools: for each tool write all the data onto the file
    // we only need to store the rawdata and not the path since it contains
    // the same information
    regularCanvas.allTools.forEach((tool, index) => {
        myString += String(index) + " # tool number # \n";
        
        myString += String(tool.type);
        myString += "   # type # \n";

        // myString += String(tool.rawdata.length);
        // myString += "   # number of (x, y) pairs in the path; followed by path as (x, y) pairs # \n";
        myString += String(tool.rawdata)+ " # (x, y) pairs for the raw data # \n";

        myString += String(tool.convexhull)+ " # (x, y) pairs for the convex hull # \n";

        myString += String(tool.editeddata)+ " # (x, y) pairs for the edited data # \n";
        
        myString += String(tool.filename);
        myString += "   # filename # \n";

        myString += String(tool.imgOffset[0]); // x offset of image
        myString += "   # imgOffset wrt x # \n";

        myString += String(tool.imgOffset[1]); // y offset of image
        myString += "   # imgOffset wrt y # \n";

        myString += String(tool.offsetX);
        myString += "   # offsetX # \n";

        myString += String(tool.offsetY);
        myString += "   # offsetY # \n";

        myString += String(tool.angle);
        myString += "   # rotation angle # \n";

        myString += String(tool.horizontalFlip );
        myString += "   # -1 if tool flipped horizontally; otherwise 1 # \n";
 
        myString += String(tool.verticalFlip );
        myString += "   # -1 if tool flipped vertically; otherwise 1 # \n";

        myString += String(tool.avgX);
        myString += "   # centerX # \n";

        myString += String(tool.avgY);
        myString += "   # centerY # \n";

        myString += String( tool.handleCenterX );
        myString += "   # handleCenterX # \n";

        myString += String(tool.handleCenterY);
        myString += "   # handleCenterY # \n";
       
        myString += String(tool.handleRadius);
        myString += "   # handleRadius # \n";

        myString += String(tool.slider);
        myString += "   # slider value # \n";

        myString += String(tool.opacity);
        myString += "   # opacity # \n";

        myString += String(tool.backgroundPaperSize);
        myString += "   # handleRadius # \n";

    });


    var makeTextFile = function (text) {
        var data = new Blob([text], {type: 'text/plain'});
    
        // if we are replacing a previously generated file we need to
        // manually revoke the object URL to avoid memory leaks.
        if (textFile !== null) {
          window.URL.revokeObjectURL(textFile);
        }
    
        var textFile = window.URL.createObjectURL(data);
    
        return textFile;
      };

    var link = document.createElement('a');
    link.setAttribute('download', 'Canvas.txt');
    link.href = makeTextFile(myString);
    document.body.appendChild(link);
    
    // wait for the link to be added to the document
    window.requestAnimationFrame(function () {
        var event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
    });
}; 


// read in a text file that was previously stored by saveCanvas
// and that describes a whole canvas
var readOldCanvas = function() {

    var myRawData = [];

    console.log("here");

    // string that contains the read file as text
    var rawFile = new XMLHttpRequest(); 
    var inputCanvasButton = document.getElementById('inputCanvasButton'); 

    // get name of the selected file
    var file = inputCanvasButton.files; //  the file that was selected

    // read in a text file that contains the state 
    // of a previously saved canvas
    var readTextFile = function(file)
        {
        rawFile.open("GET", file, false);
        rawFile.onreadystatechange = function (){
            if(rawFile.readyState === 4)
                {
                if(rawFile.status === 200 || rawFile.status == 0){
                    var allText = rawFile.responseText;
                    // alert(allText);
                }
            }
        }
        rawFile.send(null);
    }


    // now read in the chosen file
    readTextFile(file[0].name);

    var myString = rawFile.response;
    // console.log(myString);
    // the file has the following structure
    // each line has a value plus a comment
    var mySplitString = myString.split('#'); 

    var i=0;
    // now put this data into our canvas: first the main canvas parameters
    // canvas width
    regularCanvas.width = parseFloat(mySplitString[2*i]); i++;  

    // canvas height
    regularCanvas.height = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
    

    // units
    regularCanvas.unitsinmm = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
    unitsinmm = regularCanvas.unitsinmm;
    document.getElementById('selectUnit').value = unitsinmm;

    // magnification
    regularCanvas.magnification = parseFloat(mySplitString[2*i].split("\n")[1]).toFixed(2); i++;
    magnification = regularCanvas.magnification;
    document.getElementById('selectCustomMagnification').value = magnification;
    
    // it is not enough to put the values into the fields
    // we also need to update the global variables
    scale = magnification*pxpermm;
    regularCanvas.scale = scale;


    document.getElementById('myCanvasWidth').value = regularCanvas.width;
    document.getElementById('myCanvasHeight').value = regularCanvas.height;

    // determine how many tools there are
    var numTools = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
    // console.log("numTools:=", numTools);
    regularCanvas.allTools = [];

    // now loop over all tools and read in all data per tool
    for (var index = 0; index<numTools; index++) {

        // create a new path and then a new tool
        // the path with the real data is not known at this point
        // hence just put something in there for now
        var tool = new Tool("free");

        // attach this tool to the list of tools
        regularCanvas.allTools.push(tool); 

        // now put the data in there
        i++; // skip the entry where it says what tool number it is
        tool.type = "free";
        if ((mySplitString[2*i].split("\n")[1]).includes("rectangle"))
            tool.type = "rectangle"; 
        if ((mySplitString[2*i].split("\n")[1]).includes("ellipse"))
            tool.type = "ellipse";  
        i++;

        // convert the raw data back into an array of pairs
        myRawData=(mySplitString[2*i].split("\n")[1]).split(",");
        tool.rawdata = [];
            for (var j = 0; j < myRawData.length/2; j++) {
                tool.rawdata.push([parseFloat(myRawData[2*j]), parseFloat(myRawData[2*j+1])]);
            }; 
        i++;
        // convert the raw data back into an array of pairs
        myRawData=(mySplitString[2*i].split("\n")[1]).split(",");
        tool.convexhull = [];
            for (var j = 0; j < myRawData.length/2; j++) {
                tool.convexhull.push([parseFloat(myRawData[2*j]), parseFloat(myRawData[2*j+1])]);
            }; 
        i++;
        // convert the raw data back into an array of pairs
        myEditedData=(mySplitString[2*i].split("\n")[1]).split(",");
        tool.editeddata = [];
            for (var j = 0; j < myEditedData.length/2; j++) {
                tool.editeddata.push([parseFloat(myEditedData[2*j]), parseFloat(myEditedData[2*j+1])]);
            }; 
        i++;
        tool.filename = mySplitString[2*i].split("\n")[1]; i++;
        tool.imgOffset.push(parseFloat(mySplitString[2*i].split("\n")[1])); i++;
        tool.imgOffset.push(parseFloat(mySplitString[2*i].split("\n")[1])); i++;
        tool.offsetX = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.offsetY = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.angle = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.horizontalFlip = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.verticalFlip = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.avgX = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.avgY = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.handleCenterX = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.handleCenterY = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.handleRadius = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.slider = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.opacity = parseFloat(mySplitString[2*i].split("\n")[1]); i++;
        tool.backgroundPaperSize = parseFloat(mySplitString[2*i].split("\n")[1]); i++;

    
        // now recompute the path from the edited data
        // console.log("M " + myEditedData);
        computeBoundingBox(tool);
        var realpath = new Path2D("M " + tool.editeddata);
        tool.path = realpath;
    
    }

    //make sure all parameters are set correctly
    resizeCanvas();

    // plot all tools
    regularPlot();
};


// write in DXF format
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
        url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}


// write the current canvas in dxf format
// this can be read directly into the laser
// cutter program
var exportToDXFButtonFunction = function() {

    var DXFpath = "";
    
    // preamble: currently we just copy what was written in
    // a file we saw; we should read the description and adapt
    //DXFpath += "0 \nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n0\nLTYPE\n72\n65\n70\n64\n2\nCONTINUOUS\n3\n______\n73\n0\n40\n0\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";    
   
    DXFpath += "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\n$INSUNITS\n70\n4\n9\nENDSEC\n0\nSECTION\n2\nENTITIES\n";

    // draw the canvas first
    // this indicates that a new path starts 
    /*DXFpath += "0\nPOLYLINE\n8\n0\n66\n1\n70\n1\n0\n";
    DXFpath += "VERTEX\n 8\n 0\n";
    DXFpath += "10\n" + String(0)+"\n" + "20\n" + String(0)+"\n" + "0\n";
    DXFpath += "VERTEX\n 8\n 0\n";\n
    DXFpath += "10\n" + String(document.getElementById('myCanvasWidth').value)+"\n" + "20\n" + String(0)+"\n" + "0\n";
    DXFpath += "VERTEX\n 8\n 0\n";
    DXFpath += "10\n" + String(document.getElementById('myCanvasWidth').value)+"\n" + "20\n" + String(-1*document.getElementById('myCanvasHeight').value)+"\n" + "0\n";
    DXFpath += "VERTEX\n 8\n 0\n";
    DXFpath += "10\n" + String(0)+"\n" + "20\n" + String(-1*document.getElementById('myCanvasHeight').value)+"\n" + "0\n";
    DXFpath += "VERTEX\n 8\n 0\n";
    DXFpath += "10\n" + String(0)+"\n" + "20\n" + String(0)+"\n" + "0\n" + "SEQEND\n";*/
    
    DXFpath += "0\nLINE\n8\n0\n62\n8\n" + "10\n"+String(0)+"\n"+"20\n"+String(0)+"\n" + "11\n"+String(document.getElementById('myCanvasWidth').value)+"\n"+"21\n"+String(0)+"\n";
    DXFpath += "0\nLINE\n8\n0\n62\n8\n" + "10\n"+String(document.getElementById('myCanvasWidth').value)+"\n"+"20\n"+String(0)+"\n" + "11\n"+String(document.getElementById('myCanvasWidth').value)+"\n"+"21\n"+String(-1*document.getElementById('myCanvasHeight').value)+"\n";
    DXFpath += "0\nLINE\n8\n0\n62\n8\n" + "10\n"+String(document.getElementById('myCanvasWidth').value)+"\n"+"20\n"+String(-1*document.getElementById('myCanvasHeight').value)+"\n" + "11\n"+String(0)+"\n"+"21\n"+String(-1*document.getElementById('myCanvasHeight').value)+"\n";
    DXFpath += "0\nLINE\n8\n0\n62\n8\n" + "10\n"+String(0)+"\n"+"20\n"+String(-1*document.getElementById('myCanvasHeight').value)+"\n" + "11\n"+String(0)+"\n"+"21\n"+String(0)+"\n";


    // first write out all the main tool paths   
    // take the data from rawdata; write one VERTEX for each pair 
    var x;
    var y;
    var xNew;
    var yNew;
    var xInit;
    var yInit;
    regularCanvas.allTools.forEach((tool, index) => {       
        
        var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
        //myangle *= -1;
        // this indicates that a new path starts 
        //DXFpath += "0\nPOLYLINE\n8\n0\n66\n1\n70\n1\n0\n";        
        for (var ind=0; ind < tool.editeddata.length-1; ind++){
            //DXFpath += "VERTEX\n 8\n 0\n";  

            // we need to take into account flip, rotation and offset
            x = (tool.editeddata[ind][0]  - tool.avgX) * Math.cos(myangle)*tool.verticalFlip - (tool.editeddata[ind][1] - tool.avgY) * Math.sin(myangle)*tool.horizontalFlip;
            y = (tool.editeddata[ind][0]  - tool.avgX) * Math.sin(myangle)*tool.verticalFlip + (tool.editeddata[ind][1]  - tool.avgY) * Math.cos(myangle)*tool.horizontalFlip;            
            //x *= tool.verticalFlip;
            //y *= tool.horizontalFlip;          
            x += tool.offsetX + tool.avgX;
            y += tool.offsetY + tool.avgY;                    
            y *= -1;            
            
            xNew = (tool.editeddata[ind+1][0] - tool.avgX) * Math.cos(myangle)*tool.verticalFlip - (tool.editeddata[ind+1][1] - tool.avgY) * Math.sin(myangle)*tool.horizontalFlip;
            yNew = (tool.editeddata[ind+1][0] - tool.avgX) * Math.sin(myangle)*tool.verticalFlip + (tool.editeddata[ind+1][1] - tool.avgY) * Math.cos(myangle)*tool.horizontalFlip;            
            //xNew *= tool.verticalFlip;
            //yNew *= tool.horizontalFlip;          
            xNew += tool.offsetX + tool.avgX;
            yNew += tool.offsetY + tool.avgY;     
            yNew *= -1;

            /*DXFpath += "10\n";
            DXFpath += String(x)+"\n";
            DXFpath += "20\n";
            DXFpath += String(y)+"\n";
            DXFpath += "0\n";*/

            DXFpath += "0\nLINE\n8\n0\n62\n8\n" + "10\n"+String(x)+"\n"+"20\n"+String(y)+"\n" + "11\n"+String(xNew)+"\n"+"21\n"+String(yNew)+"\n";

        }
        // indicates that this path ends
        //DXFpath += "SEQEND\n";        


        // add the tool handle
        x = (tool.handleCenterX - tool.avgX) * Math.cos(myangle)*tool.verticalFlip - (tool.handleCenterY - tool.avgY) * Math.sin(myangle)*tool.horizontalFlip;
        y = (tool.handleCenterX - tool.avgX) * Math.sin(myangle)*tool.verticalFlip + (tool.handleCenterY - tool.avgY) * Math.cos(myangle)*tool.horizontalFlip;
        //x *= tool.verticalFlip;
        //y *= tool.horizontalFlip;          
        x += tool.offsetX + tool.avgX;
        y += tool.offsetY + tool.avgY;             
        y *= -1;

        DXFpath += "0\nCIRCLE\n";
        DXFpath += "10\n" + String(x)+"\n";
        DXFpath += "20\n" + String(y)+"\n";
        DXFpath += "40\n" + String(tool.handleRadius)+"\n";                    
    });   

    // post-amble
    DXFpath += "0\nENDSEC\n0\nEOF\n";    

    download(DXFpath, "DXFoutput.dxf", "dxf")
};

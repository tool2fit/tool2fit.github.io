// make a copy of a tool; if withData = true
// the all data is copied; otherwise only 
// parameters are copied
var makeToolCopy = function(tool, withData){  

    // create a new tool
    newTool = new Tool(tool.type);  

    // Copy all data?
    if (withData == true) {
        newTool.rawdata = tool.rawdata.map(inner => inner.slice());
        newTool.convexhull= tool.convexhull.map(inner => inner.slice()); 
        newTool.editeddata = tool.editeddata.map(inner => inner.slice());
        newTool.path = tool.path; 
        newTool.filename = tool.filename;
        newTool.img = tool.img;
        newTool.imgOffset = tool.imgOffset;
    }

    // parameters are always copied
    newTool.offsetX = tool.offsetX;  
    newTool.offsetY = tool.offsetY; 
    newTool.angle = tool.angle; 
    newTool.horizontalFlip = tool.horizontalFlip; 
    newTool.verticalFlip = tool.verticalFlip;

    newTool.avgX = tool.avgX; 
    newTool.avgY = tool.avgY; 
    newTool.maxX = tool.maxX; 
    newTool.minX = tool.minX;
    newTool.maxY = tool.maxY;
    newTool.minY = tool.minY;   
    
    newTool.handleCenterX = tool.handleCenterX; 
    newTool.handleCenterY = tool.handleCenterY; 
    newTool.handleDiameter = tool.handleDiameter;

    newTool.selected = false;  // for the following three parameters
    newTool.insideTool = false;  // it does not make sense to remember the state
    newTool.insideHandle = false; 
    newTool.slider = tool.slider;
    newTool.opacity = tool.opacity;
    newTool.backgroundPaperSize = tool.backgroundPaperSize;

    return newTool;
}

// copy all parameters but not the data over
var copyParameters = function(fromTool, toTool){  


    // parameters are always copied
    toTool.offsetX = fromTool.offsetX;  
    toTool.offsetY = fromTool.offsetY; 
    toTool.angle = fromTool.angle; 
    toTool.horizontalFlip = fromTool.horizontalFlip; 
    toTool.verticalFlip = fromTool.verticalFlip;

    toTool.avgX = fromTool.avgX; 
    toTool.avgY = fromTool.avgY; 
    toTool.maxX = fromTool.maxX; 
    toTool.minX = fromTool.minX;
    toTool.maxY = fromTool.maxY;
    toTool.minY = fromTool.minY;   
    
    toTool.handleCenterX = fromTool.handleCenterX; 
    toTool.handleCenterY = fromTool.handleCenterY; 
    toTool.handleDiameter = fromTool.handleDiameter;

    toTool.selected = false;  // for the following three parameters
    toTool.insideTool = false;  // it does not make sense to remember the state
    toTool.insideHandle = false; 
    toTool.slider = fromTool.slider;
    toTool.opacity = fromTool.opacity;
    toTool.backgroundPaperSize = fromTool.backgroundPaperSize;
}

// copy all parameters but not the data over
var sameAsUndoStack = function(toolIndex) {  

    var same = true;
    var undoToolIndex = regularCanvas.undoToolStack.length-1;
    var tool = regularCanvas.allTools[toolIndex];
    var undoTool = regularCanvas.undoToolStack[undoToolIndex];

    if (JSON.stringify(tool) === JSON.stringify(undoTool)) {

        return true;
    }
    else {

        return false;
    }

}


// copy the tool allTools[toolIndex] onto the undo stack
// action: one out of {"d", "m", "c'"}
// withData = true; copy not only parameters but also raw data
// resetRedo = true; reset the redo stack 
var pushOntoUndoStack = function(toolIndex, action, withData, resetRedo) {

    // push the tool onto all three stacks; copy with or without raw data
    regularCanvas.undoToolStack.push(makeToolCopy(regularCanvas.allTools[toolIndex], withData));
    regularCanvas.undoIndexStack.push(toolIndex);
    regularCanvas.undoWhatStack.push(action); 

    // check if the undo stack became too large
    if (regularCanvas.undoToolStack.length > maxUndoStackSize){
        pruneUndoStack();
    }

    // check if we should reset undo stack
    // (this will always be the case unless the last action was a redo)
    if (resetRedo == true)
        resetRedoStack();
}

// prune undo stack 
var pruneUndoStack = function() {   

    regularCanvas.undoToolStack.splice(0, 1);
    regularCanvas.undoIndexStack.splice(0, 1);
    regularCanvas.undoWhatStack.splice(0, 1);
}

// pop undo stack 
var popUndoStack = function() {   

    regularCanvas.undoToolStack.pop();
    regularCanvas.undoIndexStack.pop();
    regularCanvas.undoWhatStack.pop();
    
}

// pop redo stack 
var popRedoStack = function() {   

    regularCanvas.redoToolStack.pop();
    regularCanvas.redoIndexStack.pop();
    regularCanvas.redoWhatStack.pop();
    
}

// reset the redo stack 
var resetRedoStack = function() {        
    regularCanvas.redoToolStack = [];
    regularCanvas.redoIndexStack = [];
    regularCanvas.redoWhatStack = [];
}

// undo function
var undoButtonFunction = function() {

    // determine the length of the undo stack
    var undoLen=regularCanvas.undoToolStack.length;

    // if there is at least one action to be undone
    if (undoLen>0) {

        // if the action to be undone is a delete
        if (regularCanvas.undoWhatStack[undoLen-1] == "d") {

            // put this delete action onto the redo stack
            // there is not really anything to be put into the tool stack
            // just put a dummy tool there
            var index = regularCanvas.undoIndexStack[undoLen-1];
            regularCanvas.redoToolStack.push(new Tool("free"));
            regularCanvas.redoIndexStack.push(index);
            regularCanvas.redoWhatStack.push("d");
 
            // put this element back into its proper place in allTools
            // this time we copy with raw data
            regularCanvas.allTools.splice(index, 0, makeToolCopy(regularCanvas.undoToolStack[undoLen-1], true));

            // pop this element off the undo stack
            popUndoStack();
        }
        // if the action to be undone is a modification
        else if (regularCanvas.undoWhatStack[undoLen-1] == "m") {

            // move the current tool to the redo stack
            var index = regularCanvas.undoIndexStack[undoLen-1];
            regularCanvas.redoToolStack.push(makeToolCopy(regularCanvas.allTools[index],false));
            regularCanvas.redoWhatStack.push("m");
            regularCanvas.redoIndexStack.push(index);

            // copy the modified parameters from the undo stack to the tool stack
            copyParameters(regularCanvas.undoToolStack[undoLen-1], regularCanvas.allTools[index]);

            // pop this element off the undo stack
            popUndoStack();
        }
             // if the action to be undone is a modification where also the path was modified
             else if (regularCanvas.undoWhatStack[undoLen-1] == "M") {

                // move the current tool to the redo stack
                var index = regularCanvas.undoIndexStack[undoLen-1];
                regularCanvas.redoToolStack.push(makeToolCopy(regularCanvas.allTools[index],true));
                regularCanvas.redoWhatStack.push("M");
                regularCanvas.redoIndexStack.push(index);
    
                // modify the current tool using data from the undoStack; copy also raw data
                regularCanvas.allTools.splice(index, 1, makeToolCopy(regularCanvas.undoToolStack[undoLen-1], true));
    
                // pop this element off the undo stack
                popUndoStack();
            }
        // if the action to be undone is the creation of a new element
        else {
        
            var index = regularCanvas.undoIndexStack[undoLen-1];

            // move this new element onto redo stack; copy all data
            regularCanvas.redoToolStack.push(makeToolCopy(regularCanvas.allTools[index], true));
            regularCanvas.redoWhatStack.push("c");
            regularCanvas.redoIndexStack.push(index);

            // delete this element from allTools
            regularCanvas.allTools.splice(regularCanvas.undoIndexStack[undoLen-1], 1);

            // pop this element off the undo stack
            popUndoStack();
        }

        // redraw all tools
        regularPlot();
    }
};

// redo function
var redoButtonFunction = function() {

    // determine the index of the last element on the redo stack
    var redoLen=regularCanvas.redoToolStack.length;

    if (redoLen>0) { 
        // if the action to be redone is a delete
        if (regularCanvas.redoWhatStack[redoLen-1] == "d") {

            // save the tool to be deleted on the undoToolStack
            pushOntoUndoStack(regularCanvas.redoIndexStack[redoLen-1], "d", true, false);
      
            // delete this tool from the tool stack
            regularCanvas.allTools.splice(regularCanvas.redoIndexStack[redoLen-1], 1);  

            // pop this element off the redo stack
            popRedoStack();
        }
        // if action to be redone is a modification
        else  if (regularCanvas.redoWhatStack[redoLen-1] == "m") {

    
            var index = regularCanvas.redoIndexStack[redoLen-1];

            // copy the current tool onto the undo stack
            pushOntoUndoStack(regularCanvas.redoIndexStack[redoLen-1], "m", false, false);

            // copy the modified parameters from the redo stack to the tool stack
            copyParameters(regularCanvas.redoToolStack[redoLen-1], regularCanvas.allTools[index]);
            
            // pop this element off the redo stack
            popRedoStack();

    
        }
        // if the action to be undone is a modification where also the path was modified
        else if (regularCanvas.redoWhatStack[redoLen-1] == "M") {

            var index = regularCanvas.redoIndexStack[redoLen-1];

            // copy the current tool onto the undo stack
            pushOntoUndoStack(regularCanvas.redoIndexStack[redoLen-1], "M", true, false);
        
            // modify the current tool using data from the redoStack; copy also raw data
            regularCanvas.allTools.splice(index, 1, makeToolCopy(regularCanvas.redoToolStack[redoLen-1], true));
        
            // pop this element off the undo stack
            popRedoStack();
        }
        // if the action to be redone is a creation
        else {
           
            // copy the tool from the redo stack to the tool stack
            var index = regularCanvas.redoIndexStack[redoLen-1];
            regularCanvas.allTools.splice(index, 0, makeToolCopy(regularCanvas.redoToolStack[redoLen-1], true));

            // also push this onto the undo stack
            pushOntoUndoStack(index, "c", true, false);

            // pop this element off the redo stack
            popRedoStack();        
        }

        // redraw all tools
        regularPlot();
    }
};
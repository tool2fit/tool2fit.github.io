// undo function
var undoEditButtonFunction = function() {

    // assign shorter name
    var tool = editCanvas.toolToEdit;

    // determine the index of the last element on the undo stack
    var index=tool.undoStack.length-1;

    // if there is at least one action to be undone
    if (index >= 0) {

        // push the current state onto the redo stack
        tool.redoStack.push(makeToolCopy(tool, true));

        // copy from the undo stack onto the current tool
        // copy the editeddata, the path, as well as 
        // slider position and opacity; these are all the things
        // that can change during editing
        tool.editeddata = tool.undoStack[index].editeddata.slice();
        tool.path = tool.undoStack[index].path;
        tool.slider = tool.undoStack[index].slider;
        tool.opacity = tool.undoStack[index].opacity;

        // pop this element off the undo stack
        tool.undoStack.pop();
    }

    // redraw this tool
    editPlot(tool);

};

// redo function
var redoEditButtonFunction = function() {

    // assign shorter name
    var tool = editCanvas.toolToEdit;

    // determine the index of the last element on the redo stack
    var index=tool.redoStack.length-1;

    // if there is at least one action to be undone
    if (index >= 0) {

        // push the current state onto the undo stack
        tool.undoStack.push(makeToolCopy(tool, true));
            
        // copy from the redo stack onto the current tool
        // copy the editeddata, the path, as well as 
        // slider position and opacity; these are all the things
        // that can change during editing
        tool.editeddata = tool.redoStack[index].editeddata.slice();
        tool.path = tool.redoStack[index].path;
        tool.slider = tool.redoStack[index].slider;
        tool.opacity = tool.redoStack[index].opacity;
            
        // pop this element off the redo stack
        tool.redoStack.pop();
    }

    // redraw this tool
    editPlot(tool);

};
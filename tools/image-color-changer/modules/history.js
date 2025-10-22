// modules/history.js
export class HistoryManager{
  constructor(undoBtn=null, redoBtn=null){
    this.history = [];
    this.currentIndex = -1;
    this.undoBtn = undoBtn;
    this.redoBtn = redoBtn;
    this.updateButtons();
  }
  addState(state){
    if(this.currentIndex < this.history.length-1){
      this.history = this.history.slice(0, this.currentIndex+1);
    }
    this.history.push(state);
    this.currentIndex++;
    this.updateButtons();
  }
  undo(){ if(this.canUndo()){ this.currentIndex--; this.updateButtons(); return this.current(); } return null; }
  redo(){ if(this.canRedo()){ this.currentIndex++; this.updateButtons(); return this.current(); } return null; }
  reset(){ this.history=[]; this.currentIndex=-1; this.updateButtons(); }
  canUndo(){ return this.currentIndex>0; }
  canRedo(){ return this.currentIndex < this.history.length-1; }
  current(){ return (this.currentIndex>=0 && this.currentIndex<this.history.length) ? this.history[this.currentIndex] : null; }
  updateButtons(){
    if(this.undoBtn) this.undoBtn.disabled = !this.canUndo();
    if(this.redoBtn) this.redoBtn.disabled = !this.canRedo();
  }
}

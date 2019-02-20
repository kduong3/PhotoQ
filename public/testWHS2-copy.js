// 1. need it to respond when backspace or more than one two characters entered
// 2. need it to continue working after one tag is saved from autocomplete
var compList;
var count = 0;
//var autocomplete = document.getElementById("autoCompleteDiv");

// Called when the user pushes the "submit" button
function photoList () {
  document.getElementById("autoCompleteDiv").style.display = "none";
  tagList = popUp.state.chosen;
  stringList = tagList.toString();
	stringList = stringList.split(",").join("+");
	stringList = encodeURIComponent(stringList);

	if (tagList != "") {
	    var oReq = new XMLHttpRequest();
	    var url = "query?keyList="+tagList;
			//url = encodeURIComponent(url);
	    oReq.open("GET", url);
	    oReq.addEventListener("load", gotJSONNowWhat);
	    oReq.send();

	    // pick up oReq in closure
	    function gotJSONNowWhat() {
		showPhotos(oReq);
	    }
	}
}


function showPhotos(oReq) {
    const photoServer = "http://lotus.idav.ucdavis.edu/public/ecs162/UNESCO/";

    if (oReq.status != 200) {
	    tellUserError();
    }
    else {
	    // set global photos variable
      photos = JSON.parse(oReq.responseText);
      // set src property of all elements, since that is what gallery expects
	    photos.map(function (obj) {
		  var fileName = obj.src.split("UNESCO/")[1];
		  obj.src = photoServer+fileName; });

	    // render the photo gallery onto the page
	    const reactContainer = document.getElementById("react");
	    ReactDOM.render(React.createElement(App),reactContainer);
    }
}

function lookUpTags() {
  var key = event.keyCode || event.charCode;
  var inputVal = document.getElementById("num").value;
  //length of input is 2 without pressing backspace key
  if (inputVal.length == 2 && key != 8) {
    document.getElementById("autoCompleteDiv").style.display = "flex";
    var oReq = new XMLHttpRequest();
    var url = "query?autocomplete=" + inputVal;
    oReq.open("GET", url);
    oReq.addEventListener("load", fnCallback);
    oReq.send();

    function fnCallback() {
      count++;
      if (count == 1) {
        showTags(oReq);
      }
      else {
        showTags2(oReq);
      }
    }
  } //if
  //length of input is 2 after pressing backspace key
  else if (inputVal.length == 2 && key == 8) {
    popUp.updateState(compList);
  }
  else if (inputVal.length < 2 && key == 8) {
    document.getElementById("autoCompleteDiv").style.display = "none";
    popUp.updateState([]);
  }
  else if (inputVal.length == 3) {
    var compList1 = [];
    for ( i = 0; i < compList.length; i++ ) {
      if ( inputVal[2] == compList[i][2] ){
        compList1.push(compList[i]);
      }
    }
    popUp.updateState(compList1);
  }

  if ( key == 13) {
    photoList();
  }
} //function lookUpTags

function showTags(oReq) {
  var completions = JSON.parse(oReq.responseText);
  //global variable so that react components can access
  compList = Object.keys(completions.tags);
  const reactContainer1 = document.getElementById("autoCompleteDiv");
  popUp = ReactDOM.render(React.createElement(popUp),reactContainer1);
}

function showTags2(oReq) {
  var completions = JSON.parse(oReq.responseText);
  //global variable so that react components can access
  compList = Object.keys(completions.tags);
  popUp.updateState(compList);
}

function tellUserError() {
    var inputBar = document.getElementById("num");
    inputBar.value = "";
    inputBar.placeholder = "Bad request try again";
}


class popUp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {chosen: [], options: compList};
    this.choice = this.choice.bind(this);
    this.deleteCTag = this.deleteCTag.bind(this);
    this.updateState = this.updateState.bind(this);
  }

  updateState(newList) {
    this.setState({
      options: newList
    }, () => console.log("options list updated!"));
  }

  choice(tagToMove) {
    var chosenTag;
    var optionsList = this.state.options.slice();
    for( let i=0; i<optionsList.length; i++) {
      if( optionsList[i] === tagToMove) {
        chosenTag = optionsList[i];
        //removes 1 element at index i
        optionsList = [];
      }
    }
    //clear textbox
    document.getElementById('num').value = '';
    this.setState({
      chosen: this.state.chosen.concat(chosenTag), options: optionsList
    }, () => console.log("chosenList: " + this.state.chosen + " optionsList: " + this.state.options));
  }

  deleteCTag(tag) {
    var chosenList = this.state.chosen.slice();
    for (let i=0; i<chosenList.length; i++) {
      if (tag === chosenList[i]) {
        chosenList.splice(i, 1);
      }
    }
    this.setState({
      chosen: chosenList
    }, () => console.log("chosen list after deletion: " + this.state.chosen));
  }

  render() {
    return (React.createElement('div', {className: 'autoPopUp', id: 'autoPop'},
      React.createElement(Chosen,
        { chosenList: this.state.chosen,
          removeTag: this.deleteCTag }),
      React.createElement(Options,
        { optionsList: this.state.options,
          choiceFn: this.choice })
      ) // div pop up
    ) //return
  } //render
}; //popUp

class Chosen extends React.Component {
  constructor(props) {
    super(props);
    this.parentDelete = this.parentDelete.bind(this);
  }

  parentDelete(tag) {
    this.props.removeTag(tag);
  }

  render() {
    var chosenList = this.props.chosenList;
    var chosenElements = [];

    for (let i=0; i<chosenList.length; i++) {
      chosenElements.push(React.createElement(ChosenTags, {text: chosenList[i],
        key: chosenList[i]+i, removeTag: this.parentDelete})
      )
    }
    return (
      React.createElement('div', {className: 'chosenDiv'},
        React.createElement('div', {className: 'cTags'}, chosenElements),
        React.createElement('p', {className: 'descript'}, 'Press enter to search'),
        React.createElement('hr', {})
      )
    )
  }
} //Chosen

class ChosenTags extends React.Component {
  constructor(props) {
    super(props);
    this.handleDelete = this.handleDelete.bind(this);
  }

  handleDelete() {
    this.props.removeTag(this.props.text);
  }

  render() {
    return( React.createElement('div', {className: 'textBox', id: 'chosenTags'},
      React.createElement('p',
        { className: 'tagText' }, this.props.text),
      React.createElement('button',
        { className: 'inputButton',
        onClick: this.handleDelete }, 'X')
      ) //div
    ) //return
  } //render
} //class ChosenTags

class Options extends React.Component {
  constructor(props) {
    super(props);
    this.state = {/*compList: compList,*/ suggestedtags: 'Suggested Tags'};
    this.selectTag = this.selectTag.bind(this);
  }

  //removes selected tag from options and call choice parent function
  selectTag(tag) {
    this.props.choiceFn(tag);
  }

  render() {
    var optionsList = this.props.optionsList;
    var optionsElements = [];

    for (let i=0; i<optionsList.length; i++) {
      optionsElements.push(
        React.createElement(OptionsTags,
          {text: optionsList[i],
            key: optionsList[i]+i,
            selectT: this.selectTag})
      )
    }

   return ( React.createElement('div', {className: 'optionsDiv' },
      React.createElement('p',{ className: 'descript'},this.state.suggestedtags),  // contents
      React.createElement('div',{ className: 'OTags'}, optionsElements)
    )//div
  )//return

  }
} //Options

class OptionsTags extends React.Component {
  constructor(props) {
    super(props);
    this.handleOnclick = this.handleOnclick.bind(this);
  }

  handleOnclick() {
    //pass selected tag to selectTag()
    this.props.selectT(this.props.text);
  }

  render() {
    return (React.createElement('div', { className: 'oTagDiv' },
      React.createElement('p',
        { className: 'acTagText',
          onClick: this.handleOnclick }, this.props.text),
      React.createElement('i',
        { className: 'material-icons',
          onClick: this.handleOnclick }, "call_made")
      ) // oTagDiv
    ) //return
  }
} // OptionsTags

// A react component for a tag
class Tag extends React.Component {
    constructor(props) {
      super(props);
      this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete(e) {
      e.stopPropagation();
      this.props.deleteT(this.props.text, this.props.photoId);
    }

    render () {
	return ( React.createElement('div', {className: 'textBox' },
     React.createElement('p',{ className: 'tagText'}, this.props.text),  // contents
     React.createElement('button',
      { className: 'inputButton',
        onClick: this.handleDelete }, 'X')
   )//div
 )//return
   } // render
}; // Tag

class AddTag extends React.Component {
    constructor(props) {
      super(props);
      this.state = { newTagInput: ''};
      this.handleChange = this.handleChange.bind(this);
      this.handleInputClick = this.handleInputClick.bind(this);
      this.handleOnclick = this.handleOnclick.bind(this);
    }

    handleInputClick(e) {
      e.stopPropagation();
    }

    handleChange(e) {
      console.log("addTag clicked! input: " + e.target.value);
      this.setState({ newTagInput: e.target.value },
        () => console.log("input: " + this.state.newTagInput));
    }

    handleOnclick(e) {
      e.stopPropagation();
      if (this.state.newTagInput != "") {
        this.props.addTag(e, this.state.newTagInput, this.props.photoId);
        this.setState({ newTagInput: "" });
      }
    }

    render () {
      return (React.createElement('div', { className: 'inputBox'},
         React.createElement('input',
           {className: 'textInput',
           id: 'addTagBox' + this.props.photoId,
           value: this.state.newTagInput,
           onChange: this.handleChange,
           onClick: this.handleInputClick}),
         React.createElement('button',
           {className: 'inputButton',
           onClick: this.handleOnclick}, '+')
        )
      )
    }
} // AddTag

// A react component for controls on an image tile
class TileControl extends React.Component {
    constructor(props) {
      super(props);
      this.state = {_tags: this.props.tags}
      this.addNewTag = this.addNewTag.bind(this);
      this.deleteTag = this.deleteTag.bind(this);
    }

    deleteTag(tag, photoId) {
      var currentTag;
      var listTags = this.state._tags.slice();
      console.log(listTags.length);
      for( let i=0; i<listTags.length; i++) {
        if( listTags[i] === tag) {
          currentTag = listTags[i];
          //removes 1 element at index i
          listTags.splice(i, 1);
        }
      }
      this.setState({
        _tags: listTags
      }, () => console.log("new list after deletion: ", this.state._tags));

      var oReq = new XMLHttpRequest();
      var url = "query?deleteKey=" + currentTag + "+" + photoId
      oReq.open("GET", url);
      oReq.addEventListener("load", fnCallback);
      oReq.send();

      function fnCallback() {
        //nothing to do here
      }
    }

    addNewTag(e, input, photoId) {
      var newTags = this.state._tags.slice();
      this.setState({
        _tags: this.state._tags.concat(input)
      }, () => console.log("input: " + this.state._tags));
      var oReq = new XMLHttpRequest();
      var url = "query?addKey=" + input + "+" + photoId
      oReq.open("GET", url);
      oReq.addEventListener("load", fnCallback);
      oReq.send();

      function fnCallback() {
        //nothing to do here
      }
    }

    render () {
	  // remember input vars in closure
    var _selected = this.props.selected;
    var _src = this.props.src;
    var tagsList = this.state._tags;

    // parse image src for photo name

		var tagElements = [];
		for (let i=0; i< tagsList.length; i++) {
			tagElements.push(
        React.createElement( Tag,
          {text: tagsList[i],
           key: tagsList[i]+i,
           deleteT: this.deleteTag,
           photoId: this.props.photoId})
      //div
      );
		}

    return ( React.createElement('div',
 	  	{className: _selected ? 'selectedControls' : 'normalControls'},
    	// div contents - so far only one tag
      React.createElement('div',
		 		{ className: 'controls' },
				tagElements,
        React.createElement(AddTag,
          { className: 'newTag',
            photoId: this.props.photoId,
            addTag: this.addNewTag })
      ), //text: photoName })
    )// createElement div
	)// return
    } // render
}; //TileControl


// A react component for an image tile
class ImageTile extends React.Component {

    constructor(props) {
	    super(props);
	    this.state = { selected: this.props.photo.selected /*starts as undefined*/,
        tags: this.props.photo.listTags.split(",") };
	    this.toggle = this.toggle.bind(this);
      console.log("this.state.tags: " + this.state.tags);
    }

    toggle(e) {
    	var opposite = !this.state.selected;
    	this.setState( { selected: opposite /*opposite of undefined is true*/} );
    }

    render() {
    	var _photo = this.props.photo;
    	var _selected = _photo.selected; // this one is just for readability

    	return (
        React.createElement( 'div', {classname: 'searchedTags'}),
        React.createElement('div',
            {style: {margin: this.props.margin, width: _photo.width},
    	       className: 'tile',
    	       onClick: this.toggle },
		    // contents of div - the Controls and an Image
        		React.createElement(TileControl,
        		    {selected: this.state.selected,
        		     src: _photo.src,
                 tags: this.state.tags,
                 photoId: _photo.idNum
                }),
        		React.createElement('img',
        		    {className: this.state.selected ? 'selected' : 'normal',
                 src: _photo.src,
        		     width: _photo.width,
                 height: _photo.height
        			  })
        )//createElement div
	    ); // return
    } // render
} // ImageTile



// The react component for the whole image gallery
// Most of the code for this is in the included library
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { photos: photos };
  }

  render() {
    return (
       React.createElement( Gallery, {photos: photos,
		   ImageComponent: ImageTile})
	    );
  }
} // App

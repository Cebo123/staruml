/**
 * main.js is the entry point to be executed when StarUML is started
 * init() function will be called when the extension is loaded.
 */

//#region Constants

const TEXTNOTE = "Los metodos de seteo aplican a todas las clases"
// Tolerance for use cases enumeration
const X_OFFSET_TOLLERANCE = 80

//#endregion

//#region StringUtils

/**
 * Checks whether a string begins with a letter.
 * @param {string} _string The string to check.
 * @return {boolean} True if the string begins with a letter, false otherwise.
 */
function startsWithLetter (_string)
{
  if (new RegExp(`^[a-zA-Z]`).test(_string))
  {
    return true
  }
  return false
}

/**
 * Returns a string with it's first letter as upper or lower case, ff it doesn't start with a letter it returns the same string.
 * @param {string} _string The initial string which first letter should be upper or lower case.
 * @param {boolean} upper If true, the string returned will have it's first letter upper case, otherwise it'll be lower case. True by deffault
 * @returns {string} The string with it's first letter as upper case.
 */
function firstUpperOrLowerCase (_string, upper = true) {
  if (!startsWithLetter(_string))
  {
    return _string
  }

  if (_string.length > 0) {
    if (upper)
    {
      return _string[0].toUpperCase() + _string.slice(1)
    } else
    {
      return _string[0].toLowerCase() + _string.slice(1)
    }
  }
  return ""
}

/**
 * Returns a string starting with a number
 * @param {string} _string The initial string which will have a number added
 * @param {Int} number The number which will be added to the string
 * @returns {string} The string with the number
 */
function addNumber (_string, number) {
  return `${number}. ${_string}`
}

/**
 * Returns a string with no number if it already had it
 * @param {string} _string The string to check whether it already has a number
 * @returns {string} The string without the number
 */
function checkNumberAlreadyAdded (_string){
  dotIndex = _string.indexOf(".")
  if (dotIndex == -1){
    return _string
  } else {
    return _string.substring(dotIndex + 2)
  }
}

//#endregion

//#region NatureUtils

/**
 * Check whether a class already contains an operation or attribute
 * Nature includes operations and attributes.
 * @param {object} _class 
 * @param {string} nameToSearch The name of the nature that will be searched.
 * @param {boolean} isOperation If it's true this function will search for an operarion. Otherwise it'll search for an attribute.
 * @returns {boolean} Whether the class already contained the nature.
 */
function classContainsNature(_class, nameToSearch, isOperation = true)
{
  // Get operations or attributes
  if (isOperation)
  {
    var nature = app.repository.select(`${_class.name}::@UMLOperation`)
  } else
  {
    var nature = app.repository.select(`${_class.name}::@UMLAttribute`)
  }

  // Search for operation or attribute with the name
  for (let i = 0; i < nature.length; i++) {
    if (nature[i].name == nameToSearch)
    {
      return true
    }
  }

  return false
}

/**
 * Add one nature to a class
 * Nature includes operations and attributes.
 * @param {object} _class The model class to add the nature.
 * @param {string} nameToAdd The name of the nature that will be added.
 * @param {boolean} isOperation If it's true this function will add an operarion. Otherwise it'll add attribute. Default is true
 */
function addNature(_class, nameToAdd, isOperation = true)
{
  if (!classContainsNature(_class, nameToAdd, isOperation))
    {
      // Begin build
      var builder = app.repository.getOperationBuilder()
      builder.begin("Add")

      // Create nature
      if (isOperation)
      {
        var newNature = new type.UMLOperation()
      } else
      {
        var newNature = new type.UMLAttribute()
      }
      newNature.name = nameToAdd
      newNature.visibility = type.UMLModelElement.VK_PUBLIC
      newNature._parent = _class

      // Add nature
      builder.insert(newNature)
      if (isOperation)
      {
        builder.fieldInsert(_class, "operations", newNature)
      } else
      {
        builder.fieldInsert(_class, "attributes", newNature)
      }
      
      // End build
      builder.end()
      var cmd = builder.getOperation()
      app.repository.doOperation(cmd)
    }
}


/**
 * Add the nature for an association
 * Nature includes operations and attributes.
 * @param {object} classToAddNature The model class to add the nature.
 * @param {object} classAssociated The associated model class.
 */
function addAssociationNature (classToAddNature, classAssociated)
{
  associatedClassName = classAssociated.name

  if (!startsWithLetter(associatedClassName))
  {
    app.toast.error(`La clase '${associatedClassName}' deberia empezar con una letra. Los atributos y metodos de sus asociaciones no serán agregados`)
    return
  }

  //  Add atribute
  addNature(classToAddNature, `${firstUpperOrLowerCase(associatedClassName, false)}: ${firstUpperOrLowerCase(associatedClassName)}`, false)
  // Add operation
  addNature(classToAddNature, `conocer${firstUpperOrLowerCase(associatedClassName)}`)
}

//#endregion

//#region ViewUtils

/**
 * Returns the view object of a model object.
 * @param {object} modelObject The model object from which to get the view object.
 * @param {string} type The type of the view object such as "@UMLClassView".
 * @returns The corresponding view object, if it isn't found returns null.
 */
function getViewObject(modelObject)
{
  // Get all objectView objects
  viewType = `@${modelObject.constructor.name}View`
  var objectViews = app.repository.select(viewType)

  // Search for the corresponding classView
  for (let i = 0; i < objectViews.length; i++) 
  {
    if (objectViews[i].model._id == modelObject._id)
    {
      return objectViews[i]
    }
  }
  return null
}

/**
 * Delete all the model objects of a type which don't have a view object
 * @param {string} modelType The type of the model objects to be deleted such as "@UMLClass".
 */
function deleteNotViewedObjects(modelType)
{
  // Get objects in the project
  var allObjects = app.repository.select(modelType)
  if (allObjects.length == 0)
  {
    return
  }

  notViewedObjects = []
  for (let i = 0; i < allObjects.length; i++)
  {
    const _object = allObjects[i]

    if (getViewObject(_object) == null)
    {
      notViewedObjects.push(_object)
    }
  }
  
  app.engine.deleteElements(notViewedObjects, [])
}

/**
 * Returns the position {x1, y1, x2, y2} near a view object
 * @param {object} viewObject The view object from which to get the new position near it
 * @returns {Int, Int, Int, Int} The near position {x1, y1, x2, y2}
 */
function getNearPossition (viewObject)
{
  x1 = viewObject.mainRect.x2 + 80
  y1 = viewObject.mainRect.y1
  x2 = x1 + 70
  y2 = y1 + 120

  return {x1:x1, y1:y1, x2:x2, y2:y2}
}

/**
 * Returns the model objects sorted from up to down, from left to right
 * @param {object} objects The objects which will be sorted
 * @returns The sorted objects
 */
function sortByPossition (objects) 
{
  // positionedObject := {object, xPos, yPos}
  // ListObjets will be of the form [ positionedObject1, positionedObject2, ... ]
  var listObjects = Array(objects.length)
  // Columns will be of the form [ [ positionedObject1, positionedObject2, ... ], [positionedObject3, positionedObject4, ...], ... ]
  var columns = []

  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const viewObject = getViewObject(objects[i])
    const xPos = viewObject.mainRect.x1
    const yPos = viewObject.mainRect.y1
    listObjects[i] = {object: object, xPos: xPos, yPos: yPos}
  }

  // Get columns
  for (let i = 0; i < listObjects.length; i++) {
    const object = listObjects[i];

    // If the column isn't already added: -1. Otherwise the index of the column
    columnIndex = -1
    for (let j = 0; j < columns.length; j++) {
      const column = columns[j];
      if (Math.abs(column[0].xPos - object.xPos) <= X_OFFSET_TOLLERANCE) {
        columnIndex = j
      }
    }

    if (columnIndex == -1) {
      columns.push( [ object ] )
    } else {
      columns[columnIndex].push( object )
    }
  }

  // Sort each column
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    column.sort(function(a,b){
      return a.yPos - b.yPos
    })
  }

  // Sort columns
  columns.sort(function(a,b){
    return a[0].xPos - b[0].xPos
  })

  listObjects = columns.flat()
  var finalList = Array(objects.length)
  for (let i = 0; i < listObjects.length; i++) {
    const object = listObjects[i];
    finalList[i] = object.object
  }

  return finalList
}

//#endregion

//#region Handles

/**
 * Adds the methods crear and mostrar for all the classes.
 * @returns {null} Returns to exit the function.
 */
function handleCrearMostrar () {

  // Get model project object
  var project = app.project.getProject()

  // Get classes in the project
  var classes = app.repository.select("@UMLClass")
  if (classes.length == 0)
  {
    app.toast.error("No hay clases en el proyecto")
    return
  }

  // Add the operations foreach class
  for (let i = 0; i < classes.length; i++) {
    var _class = classes[i]

    addNature(_class, "crear")
    addNature(_class, "mostrar")
    
  }

  app.toast.info("crear() mostrar(): Finalizado")
}


/**
 * Adds the accesors for the class with less attribute and a note by its side.
 * @returns {null} Returns to exit the function.
 */
function handleSeteo ()
{
  // Get classes in the project
  var classes = app.repository.select("@UMLClass")
  if (classes.length == 0)
  {
    app.toast.error("No hay clases en el proyecto")
    return
  }

  // Get class with less attributes
  var lessAttributesClass = classes[0]
  var attributes = app.repository.select(`${lessAttributesClass.name}::@UMLAttribute`)
  for (let i = 1; i < classes.length; i++)
  {
    var _attributes = app.repository.select(`${classes[i].name}::@UMLAttribute`)

    if (_attributes.length < attributes.length)
    {
      lessAttributesClass = classes[i]
      attributes = _attributes
    }
  }

  // Add opperations
  for (let i = 0; i < attributes.length; i++) 
  {
    var _attributeName = attributes[i].name

    if (!startsWithLetter(_attributeName))
    {
      app.toast.error(`El atributo '${_attributeName}' de la clase '${lessAttributesClass.name}' debería empezar con una letra. No se agregarán sus metodos de seteo`)
      continue
    }

    addNature(lessAttributesClass, `tomar${firstUpperOrLowerCase(_attributeName)}`)
    addNature(lessAttributesClass, `mostrar${firstUpperOrLowerCase(_attributeName)}`)
  }

  // Check that there isn't a note already
  var noteViews = app.repository.select("@UMLNoteView")
  var noteAlreadyExists = false
  if (noteViews.length > 0)
  {
    for (let i = 0; i < noteViews.length; i++) 
    {
      if (noteViews[i].text == TEXTNOTE)
      {
        noteAlreadyExists = true
      }
    }
  }
  if (!noteAlreadyExists)
  {
    // Add note
    var diagram = app.repository.select("@UMLClassDiagram")
    var viewClass = getViewObject(lessAttributesClass)
    if (diagram.length == 0)
    {
      app.toast.error("No hay un diagrama de clases en el proyecto")
      return
    }
    var nearPossition = getNearPossition(viewClass)
    var noteOptions =
    {
      id: "Note", 
      parent: diagram[0]._parent,
      diagram: diagram[0],
      x1: nearPossition.x1,
      y1: nearPossition.y1,
      x2: nearPossition.x2,
      y2: nearPossition.y2
    }
    var note = app.factory.createModelAndView(noteOptions)
    app.engine.setProperty(note, "text", TEXTNOTE)

    var noteLinkOptions =
    {
      id: "NoteLink",
      parent: diagram[0]._parent,
      diagram: diagram[0],
      tailView: viewClass,
      headView: note,
    }
    var noteLink = app.factory.createModelAndView(noteLinkOptions)
  }

  app.toast.info("Metodos seteo: Finalizado")
}


/**
 * Adds all the associations attributes and methods for all the classes in the project.
 */
function handleAssociations ()
{
  // Get associations (it includes associations, aggregations and compositions. It doesnt include inheritance)
  var associations = app.repository.select("@UMLAssociation")

  for (let i = 0; i < associations.length; i++) 
  {
    var _association = associations[i];
    
    var end1Class = _association.end1.reference
    var end2Class = _association.end2.reference

    if (_association.end2.navigable == "navigable")
    {
      addAssociationNature(end1Class, end2Class)
    } 
    if (_association.end1.navigable == "navigable")
    {
      addAssociationNature(end2Class, end1Class)
    }

  }

  app.toast.info("Asociaciones: Finalizado")
}


/**
 * Delete model objects which don't have a view object.
 */
function handleNotViewed ()
{
  // The type of objects which will be deleted
  objectTypes = ["@UMLClass", "@UMLAssociation", "@UMLGeneralization", "@UMLUseCase", "@UMLActor"]

  objectTypes.forEach(deleteNotViewedObjects)

  app.toast.info("No vistos: Finalizado")
}

/**
 * Set auto resize to true for all clases.
 */
function handleAutoResize ()
{
  var classes = app.repository.select("@UMLClass")
  if (classes.length == 0)
  {
    return
  }

  for (let i = 0; i < classes.length; i++) {
    const _viewObject = getViewObject(classes[i])
    app.engine.setProperty(_viewObject, 'autoResize', true)
  }

  app.toast.info("Activar auto resize: Finalizado")
}

/**
 * Execute all the previous handles
 */
function handleDoEverything ()
{
  // Not viewed model object must be deleted first
  handleNotViewed ()

  handleCrearMostrar ()
  handleSeteo ()
  handleAssociations ()
  handleAutoResize ()
  handlePrivateAtributes ()
}

/**
 * Tipify the selected attribute
 */
function handleTipifyAttribute ()
{
  // Get the selected attribute
  var selectedViewObjects = app.selections.getSelectedViews()

  if (selectedViewObjects.length != 1){
    app.toast.error("Debe seleccionar un atributo")
    return
  }
  if (selectedViewObjects[0].constructor.name != "UMLAttributeView"){
    app.toast.error("No selecciono un atributo")
    return
  }
  var attributeView = selectedViewObjects[0]

  // Create the class
  var originalClassView = attributeView._parent._parent
  var classDiagram = originalClassView._parent
  var tipifiedClassPossition = getNearPossition(attributeView._parent._parent)
  var tipifiedClassOptions = {
    id: "UMLClass",
    diagram: classDiagram,
    parent: originalClassView.model._parent,
    x1: tipifiedClassPossition.x1,
    y1: tipifiedClassPossition.y1,
    x2: tipifiedClassPossition.x2,
    y2: tipifiedClassPossition.y2
  }
  var tipifiedClassView = app.factory.createModelAndView(tipifiedClassOptions)

  // Create the association
  var associationOptions = {
    id: "UMLAssociation",
    parent: originalClassView.model,
    diagram: classDiagram,
    tailView: originalClassView,
    headView: tipifiedClassView,
    tailModel: originalClassView.model,
    headModel: tipifiedClassView.model
  }
  var assoView = app.factory.createModelAndView(associationOptions)

  // Update the association
  app.engine.setProperty(assoView.model.end2, "navigable", "navigable")
  app.engine.setProperty(assoView.model.end2, "multiplicity", "1")

  // Update the classes
  // Delete the attribute
  app.engine.deleteElements([selectedViewObjects[0].model], selectedViewObjects)
  app.selections.deselectAll()
  // Update name
  app.engine.setProperty(tipifiedClassView.model, "name", firstUpperOrLowerCase(attributeView.model.name))
  // Add methods and attributes
  addAssociationNature(originalClassView.model, tipifiedClassView.model)
  addNature(tipifiedClassView.model, "nombre", false)
  addNature(tipifiedClassView.model, "descripcion", false)
  addNature(tipifiedClassView.model, "crear")
  addNature(tipifiedClassView.model, "mostrar")
  // Auto resize
  app.engine.setProperty(tipifiedClassView, 'autoResize', true)
  

  app.toast.info("Tipificar atributo: Finalizado")
}

/**
 * Adds a number to the name of all the use cases.
 * Starting from up to down and from left to right
 */
function handleEnumerateUseCases ()
{
  var useCases = app.repository.select("@UMLUseCase")

  useCases = sortByPossition(useCases)

  for (let i = 0; i < useCases.length; i++) {
    const useCase = useCases[i]
    const useCaseName = checkNumberAlreadyAdded(useCase.name)
    app.engine.setProperty(useCase, "name", addNumber(useCaseName, i+1))
  }

  app.toast.info("Enumerar casos de uso: Finalizado")
}

/**
 * Makes every atribute of every class private
 */
function handlePrivateAtributes (){
  // Get classes
  var classes = app.repository.select("@UMLClass")

  for (let i = 0; i < classes.length; i++) {
    const _class = classes[i];

    // Get atributes
    var atributes = app.repository.select(`${_class.name}::@UMLAttribute`)
    for (let j = 0; j < atributes.length; j++) {
      const atribute = atributes[j];
      
      // Set private
      app.engine.setProperty(atribute, "visibility", "private")
    }
  }

  app.toast.info("Hacer atributos privados: Finalizado")
}

//#endregion

/**
 * init() function will be called when the extension is loaded.
 */
function init () 
{
  app.commands.register("ASI:crear-mostrar", handleCrearMostrar)
  app.commands.register("ASI:seteo", handleSeteo)
  app.commands.register("ASI:associations", handleAssociations)
  app.commands.register("ASI:notViewed", handleNotViewed)
  app.commands.register("ASI:autoResize", handleAutoResize)
  app.commands.register("ASI:doEverything", handleDoEverything)
  app.commands.register("ASI:tipifyAttribute", handleTipifyAttribute)
  app.commands.register("ASI:enumerateUseCases", handleEnumerateUseCases)
  // TODO: Make atributes private
  app.commands.register("ASI:privateAtributes", handlePrivateAtributes)
}

exports.init = init
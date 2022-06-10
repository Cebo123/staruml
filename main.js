const TEXTNOTE = "Los metodos de seteo aplican a todas las clases"

function classContainsOperation(_class, operationName)
{
  // Get operations
  var operations = app.repository.select(`${_class.name}::@UMLOperation`)

  // Search for operation with the operationName
  for (let i = 0; i < operations.length; i++) {
    if (operations[i].name == operationName)
    {
      return true
    }
  }

  return false
}

function addOperation(_class, operationName)
{
  if (!classContainsOperation(_class, operationName))
    {
      // Begin build
      var builder = app.repository.getOperationBuilder()
      builder.begin("Add operations")

      // Create operation
      var newOperation = new type.UMLOperation()
      newOperation.name = operationName
      newOperation.visibility = type.UMLModelElement.VK_PUBLIC
      newOperation._parent = _class

      // Add operation
      builder.insert(newOperation)
      builder.fieldInsert(_class, "operations", newOperation)
      
      // End build
      builder.end()
      var cmd = builder.getOperation()
      app.repository.doOperation(cmd)
    }
}

function firstUpperCase (_string) {
  if (_string.length > 0) {
    return _string[0].toUpperCase() + _string.substr(1, _string.length - 1)
  }
  return ''
}

function GetViewClass(_class, project)
{
  // Get all classView objects
  var classViews = app.repository.select("@UMLClassView")
  // Search for the corresponding classView
  for (let i = 0; i < classViews.length; i++) 
  {
    if (classViews[i].model._id == _class._id)
    {
      return classViews[i]
    }
  }
  return null
}

function handleCrearMostrar () {

  // Get model project object
  var project = app.project.getProject()

  // Log objects (for tests)
  //console.log(project.ownedElements[0])

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

    addOperation(_class, "crear")
    addOperation(_class, "mostrar")
    
  }

  app.toast.info("crear() mostrar(): Finalizado")
}

function handleSeteo ()
{
  // Get model project object
  var project = app.project.getProject()
  
  // Log objects (for tests)
  //console.log(project.ownedElements[0])

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
    addOperation(lessAttributesClass, `tomar${firstUpperCase (attributes[i].name)}`)
    addOperation(lessAttributesClass, `mostrar${firstUpperCase (attributes[i].name)}`)
  }

  // Check that there isn't a note already
  var noteViews = app.repository.select("@UMLNoteView")
  var noteAlreadyExists = false
  if (noteViews.length > 0)
  {
    for (let i = 0; i < noteViews.length; i++) 
    {
      if (noteViews[i].text = TEXTNOTE)
      {
        noteAlreadyExists = true
      }
    }
  }
  if (!noteAlreadyExists)
  {
    // Add note
    var diagram = app.repository.select("@UMLClassDiagram")
    var viewClass = GetViewClass(lessAttributesClass, project)
    if (diagram.length == 0)
    {
      app.toast.error("No hay un diagrama de clases en el proyecto")
      return
    }
    x1 = viewClass.mainRect.x2 + 20
    y1 = viewClass.mainRect.y1
    x2 = x1 + 70
    y2 = y1 + 120
    var options =
    {
      id: "Note", 
      parent: diagram[0]._parent,
      diagram: diagram[0],
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    }
    var note = app.factory.createModelAndView(options)
    app.engine.setProperty(note, "text", TEXTNOTE)
  }

  app.toast.info("Metodos seteo: Finalizado")
}

function handleAssociations ()
{
  // Get model project object
  var project = app.project.getProject()

  // TODO: Add attribute and operation for the asosiations

  app.toast.info("Asociaciones: Finalizado")
}

function init () 
{
  app.commands.register("ASI:crear-mostrar", handleCrearMostrar)
  app.commands.register("ASI:seteo", handleSeteo)
  app.commands.register("ASI:associations", handleAssociations)

  // TODO: Delete model objects which don't have a view object


}

exports.init = init
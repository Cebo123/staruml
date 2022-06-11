const TEXTNOTE = "Los metodos de seteo aplican a todas las clases"

function firstUpperCase (_string) {
  if (_string.length > 0) {
    return _string[0].toUpperCase() + _string.substr(1, _string.length - 1)
  }
  return ''
}

function firstLowerCase (_string)
{
  if (_string.length > 0) {
    return _string[0].toLowerCase() + _string.substr(1, _string.length - 1)
  }
  return ''
}

// Nature includes operations and attributes
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

function addAssociationNature (classToAddNature, classToGetName)
{
  //  Add atribute
  addNature(classToAddNature, `${firstLowerCase(classToGetName.name)}: ${firstUpperCase(classToGetName.name)}`, false)
  // Add operation
  addNature(classToAddNature, `conocer${firstUpperCase(classToGetName.name)}`)
}



function getViewClass(_class)
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

function handleSeteo ()
{
  // Get model project object
  var project = app.project.getProject()

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
    var _attribute = attributes[i]
    addNature(lessAttributesClass, `tomar${firstUpperCase(_attribute.name)}`)
    addNature(lessAttributesClass, `mostrar${firstUpperCase(_attribute.name)}`)
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
    var viewClass = getViewClass(lessAttributesClass, project)
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

function init () 
{
  app.commands.register("ASI:crear-mostrar", handleCrearMostrar)
  app.commands.register("ASI:seteo", handleSeteo)
  app.commands.register("ASI:associations", handleAssociations)

  // TODO: Delete model objects which don't have a view object
}

exports.init = init
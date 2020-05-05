// This will be called by the admin adapter when the settings page loads
function load(settings, onChange) {
  // example: select elements with id=key and class=value and insert value
  if (!settings) return;
  $('.value').each(function () {
    var $key = $(this);
    var id = $key.attr('id');
    if ($key.attr('type') === 'checkbox') {
      // do not call onChange direct, because onChange could expect some arguments
      $key.prop('checked', settings[id])
        .on('change', () => onChange())
        ;
    } else {
      // do not call onChange direct, because onChange could expect some arguments
      $key.val(settings[id])
        .on('change', () => onChange())
        .on('keyup', () => onChange())
        ;

    }
  });
  $('#url').on('blur', () => {
    console.log("update url " + $('#url').val())
    $.ajax({
      url: "http://" + $('#url').val() + "/api/v1/action",
      contentType: "text/plain",
      success: applyValues,
      error: (x, y) => { console.log(x + "," + y) }
    })
  })
  onChange(false);
  // reinitialize all the Materialize labels on the page if you are dynamically adding inputs:
  if (M) M.updateTextFields();
}

// This will be called by the admin adapter when the user presses the save button
function save(callback) {
  // example: select elements with class=value and build settings object
  var obj = {};
  $('.value').each(function () {
    var $this = $(this);
    if ($this.attr('type') === 'checkbox') {
      obj[$this.attr('id')] = $this.prop('checked');
    } else {
      obj[$this.attr('id')] = $this.val();
    }
  });
  callback(obj);
}

function applyValues(data) {
  console.log("got values " + JSON.stringify(data))
}
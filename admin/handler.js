// This will be called by the admin adapter when the settings page loads
function load(settings, onChange) {
  if (!settings) return;
  if (!settings.hostip) {
    const href = `${window.location.protocol || "http:"}//${window.location.hostname || "127.0.0.1"}:8087`
    settings.hostip = href
  }
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

  /* Doesn'nt work with current Dingz!
  $('#url').on('blur', () => {
    console.log("update url " + $('#url').val())
    const requestOptions = {
      method: 'GET',
      redirect: 'follow',
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Encoding": "gzip,deflate",
        "User-Agent": "Mozilla/5.0"
      },
    }
    fetch("http://192.168.16.59/api/v1/action", requestOptions)
      .then(response => response.text())
      .then(result => applyValues(result))
      .catch(err => console.log("error", err));
  })
  */
  $('#sw-btn').hide()
  $('#sw-pir').hide()
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
  if (obj.url.indexOf("://") == -1) {
    obj.url = "http://" + obj.url
  }
  if (obj.hostip.indexOf("://") == -1) {
    obj.hostip = "http://" + obj.hostip
  }
  callback(obj);
}

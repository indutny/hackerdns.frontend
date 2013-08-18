!function() {
  var buttons = {
    login: $('#btn-login'),
    logout: $('#btn-logout'),
    modalLogin: $('#btn-modal-login'),
    modalRemove: $('#btn-modal-remove')
  };

  var modal = {
    login: $('#login'),
    remove: $('#remove')
  };

  var form = {
    login: $('#form-login'),
    add: $('#form-add-record')
  };

  var records = $('#records');

  // Session token
  var token = null;

  function api(method, url, data, options) {
    if (!options && data) {
      options = data;
      data = null;
    }
    $.ajax('https://api.hackerdns.com' + url, {
      type: method,
      headers: token && {
        'X-Hackerdns-Token': token
      },
      data: data && JSON.stringify(data),
      contentType: data && 'application/json',
      success: options.success,
      error: options.error,
      complete: options.complete
    });
  }

  // Login
  form.login.submit(function(e) {
    e.preventDefault();

    buttons.modalLogin.button('loading');
    api('POST', '/signup', {
      email: form.login.find('[name=email]').val(),
      password: form.login.find('[name=password]').val()
    }, {
      success: function(data) {
        token = data.token;
        buttons.login.addClass('hidden');
        buttons.logout.removeClass('hidden');
        modal.login.modal('hide');

        // Clear inputs
        form.login.find('input').val('');
        form.login.find('.alert').addClass('hidden');

        // Load records
        refreshRecords();
      },
      error: function() {
        form.login.find('.alert').removeClass('hidden').alert();
      },
      complete: function() {
        // Reset button's state
        buttons.modalLogin.button('reset');
      }
    });
  });

  // Logout
  buttons.logout.click(function(e) {
    buttons.logout.button('loading');
    api('POST', '/logout', {}, {
      success: function() {
        buttons.login.removeClass('hidden');
        buttons.logout.addClass('hidden');
        token = null;
        refreshRecords();
      },
      error: function() {
      },
      complete: function() {
        buttons.logout.button('reset');
      }
    });
  });

  function stringToData(type, str) {
    if (type === 'A' || type === 'AAAA' || type === 'CNAME' || type === 'NS')
      return str;
    if (type === 'MX') {
      var data = str.split(/\s+/g, 2);
      return [ data[0] | 0, data[1] ];
    }
    if (type === 'TXT')
      return str.split(/\s*,\s*/g);
    return null;
  }

  form.add.submit(function(e) {
    e.preventDefault();
    form.add.find('input[type=submit]').button('loading');
    var type = form.add.find('[name=type]').val().toUpperCase();
    var domain = form.add.find('[name=domain]').val();
    var domainTld = tld(domain);
    api('POST', '/dns', {
      domain: domainTld,
      records: [{
        sub: domain === domainTld ? '' : domain.replace('.' + domainTld, ''),
        type: type,
        data: stringToData(type, form.add.find('[name=data]').val()),
        ttl: form.add.find('[name=ttl]').val() | 0
      }]
    }, {
      success: function() {
        // Reset inputs
        form.add.find('input,select').val('');
        form.add.find('.alert').addClass('hidden');
      },
      error: function() {
        form.add.find('.alert').removeClass('hidden').alert();
      },
      complete: function() {
        form.add.find('input[type=submit]').button('reset');
        refreshRecords();
      }
    });
  });

  // Records view
  function tld(domain) {
    var match = domain.match(/([a-z0-9\-]+\.[a-z]{2,6})\.?$/);
    if (!match)
      return false;

    return match[1];
  }

  function dataToString(type, data) {
    if (type === 'A' || type === 'AAAA' || type === 'CNAME' || type === 'NS')
      return data;
    if (type === 'MX')
      return data[0] + ' ' + data[1];
    if (type === 'TXT')
      return data.join(', ');
    return '<unknown type>';
  }

  var sample = $('#sample-record').remove();
  function refreshRecords() {
    if (!token)
      return records.addClass('hidden');

    api('GET', '/dns', {
      success: function(domains) {
        records.removeClass('hidden');
        $('#records-alert').addClass('hidden');

        // Remove all existing records
        records.find('tr:not(.new-record)').remove();

        // Insert new
        domains.forEach(function(item) {
          var domain = item.domain;
          item.records.forEach(function(record) {
            var line = sample.clone();

            // Remove id
            line.removeProp('id');

            // Fill fields
            line.find('.record-subdomain').text(
              record.sub ? record.sub + '.' + domain : domain
            );
            line.find('.record-type').text(record.type);
            line.find('.record-data').text(dataToString(record.type,
                                                        record.data));
            line.find('.record-ttl').text(record.ttl);
            line.find('.record-remove').click(function(e) {
              e.preventDefault();

              modal.remove.data('record-domain', domain);
              modal.remove.data('record', record);
            });

            // Append line
            records.append(line);
          });
        });
      },
      error: function() {
        $('#records-alert').removeClass('hidden').alert();
      }
    });
  }

  buttons.modalRemove.click(function(e) {
    e.preventDefault();

    buttons.modalRemove.button('loading');
    api('DELETE', '/dns', {
      domain: modal.remove.data('record-domain'),
      records: [modal.remove.data('record')]
    }, {
      success: function() {
        modal.remove.find('.alert').addClass('hidden');
        modal.remove.modal('hide');
        refreshRecords();
      },
      error: function() {
        modal.removeClass('hidden').alert();
      },
      complete: function() {
        buttons.modalRemove.button('reset');
      }
    });
  });
}();

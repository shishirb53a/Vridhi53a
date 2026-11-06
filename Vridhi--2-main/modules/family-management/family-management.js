(function () {
  var COLORS = {
    Self: '#1f6feb',
    Spouse: '#c2255c',
    Child: '#2f9e44',
    Parent: '#f08c00',
    Other: '#868e96'
  };
  var SORTS = [['role', 'Relationship'], ['name', 'Name'], ['age', 'Age'], ['college', 'College duration']];

  function rows(ctx) {
    var state = ctx.state, ui = ctx.ui, escn = ctx.escapeName;
    var query = ui.fq.trim().toLowerCase();
    var members = state.members.map(function (member, index) {
      return { member: member, index: index };
    }).filter(function (item) {
      return (ui.frl === 'All' || item.member.role === ui.frl) &&
        (item.member.name + ' ' + item.member.role).toLowerCase().includes(query);
    });
    function sortValue(item) {
      if (ui.fk === 'name') return item.member.name.toLowerCase();
      if (ui.fk === 'age') return item.member.age;
      if (ui.fk === 'college') return item.member.role === 'Child' ? item.member.college : -1;
      return ctx.roles.indexOf(item.member.role);
    }
    members.sort(function (a, b) {
      var left = sortValue(a), right = sortValue(b);
      return (left > right ? 1 : left < right ? -1 : 0) * ui.fd;
    });
    if (!members.length) return '<div class="em">No family members match your search or filter.</div>';

    function header(key, label) {
      var active = ui.fk === key;
      return '<th aria-sort="' + (active ? (ui.fd > 0 ? 'ascending' : 'descending') : 'none') +
        '"><button data-fk="' + key + '">' + label + (active ? (ui.fd > 0 ? ' ▲' : ' ▼') : '') + '</button></th>';
    }
    function name(item) {
      return '<div class="nm"><div><b>' + escn(item.member.name) +
        '</b><div><span class="pill" style="--c:' + COLORS[item.member.role] + '">' +
        item.member.role + '</span></div></div></div>';
    }
    function actions(item) {
      return '<button class="tbs" data-me="' + item.index + '" aria-label="Edit ' +
        escn(item.member.name) + '" title="Edit">Edit</button> ' +
        (item.index ? '<button class="tbs d" data-mx="' + item.index +
          '" aria-label="Delete ' + escn(item.member.name) + '" title="Delete">Delete</button>' : '');
    }
    function childInfo(member) {
      return member.role === 'Child'
        ? '<td>' + member.cls + '</td><td>' + member.college + ' yrs</td><td class="l">' + ctx.stage(member, 1) + '</td>'
        : '<td>—</td><td>—</td><td class="l">—</td>';
    }

    return '<div class="ht tw"><table><tr>' + header('name', 'Member') + header('age', 'Age') +
      '<th>Class today</th>' + header('college', 'College duration') +
      '<th>Education stage now</th><th>Actions</th></tr>' +
      members.map(function (item) {
        return '<tr><td>' + name(item) + '</td><td>' + item.member.age + '</td>' +
          childInfo(item.member) + '<td class="nw">' + actions(item) + '</td></tr>';
      }).join('') + '</table></div><div class="hc">' +
      members.map(function (item) {
        var member = item.member;
        return '<div class="hcard" style="--c:' + COLORS[member.role] + '"><div class="hh">' +
          name(item) + '<div class="vv"><b>' + member.age + '</b><div class="mu">years</div></div></div>' +
          (member.role === 'Child'
            ? '<div class="kv"><span>Class today</span><b>' + member.cls +
              '</b><span>College duration</span><b>' + member.college +
              ' yrs</b><span>Education stage</span><b>' + ctx.stage(member, 1) + '</b></div>'
            : '') + '<div class="tb">' + actions(item) + '</div></div>';
      }).join('') + '</div>';
  }

  function page(ctx) {
    var ui = ctx.ui;
    if (!ctx.state.members.length) {
      return '<div class="card"><h2>Family</h2><p>No family members yet.</p><button type="button" class="p" id="fadd">Add your first person</button></div>';
    }
    return '<div class="card"><h2>Family</h2><div class="tb">' +
      '<input id="fq" type="search" placeholder="Search family…" aria-label="Search family" value="' +
      ctx.escape(ui.fq) + '"><select id="frf" aria-label="Filter by relationship"><option>All</option>' +
      ctx.roles.map(function (role) {
        return '<option' + (role === ui.frl ? ' selected' : '') + '>' + role + '</option>';
      }).join('') + '</select><select id="fsf" aria-label="Sort by">' +
      SORTS.map(function (sort) {
        return '<option value="' + sort[0] + '"' + (ui.fk === sort[0] ? ' selected' : '') +
          '>Sort: ' + sort[1] + '</option>';
      }).join('') + '</select><button id="fsd" aria-label="Toggle sort direction">' +
      (ui.fd > 0 ? '▲' : '▼') + '</button><button class="p" id="fadd">+ Add family member</button></div>' +
      '<div id="fr">' + rows(ctx) + '</div></div>';
  }

  function openEditor(index, ctx) {
    var state = ctx.state, isNew = index == null;
    if (isNew && state.members.length >= 12) {
      ctx.toast('Maximum 12 family members');
      return;
    }
    if (!isNew && (!Number.isInteger(index) || index < 0 || index >= state.members.length)) return;
    var original = isNew ? ctx.makeMember(0, '', 'Child', 10, 5, 4) : state.members[index];
    var self = index === 0;
    ctx.openDialog('<form id="fm" novalidate><h2>' + (isNew ? 'Add' : 'Edit') +
      ' family member</h2>' + ctx.field('mn', 'Name', original.name, 'text', 'maxlength=30 required') +
      '<p><label for="mr">Relationship</label><select id="mr" ' + (self ? 'disabled' : '') + '>' +
      ctx.roles.filter(function (role) { return role !== 'Self' || self; }).map(function (role) {
        return '<option' + (role === original.role ? ' selected' : '') + '>' + role + '</option>';
      }).join('') + '</select></p>' +
      ctx.field('ma', 'Age today', original.age, 'number', 'min=0 max=100') +
      '<div id="mk" ' + (original.role === 'Child' ? '' : 'hidden') + '>' +
      ctx.field('mc', 'Class today (1–12)', original.cls, 'number', 'min=1 max=12') +
      ctx.field('mg', 'College duration (years)', original.college, 'number', 'min=0 max=8') +
      '</div><div id="fe" class="er" role="alert"></div><div class="tb"><button class="p">Save</button>' +
      '<button type="button" id="cn">Cancel</button></div></form>');

    var get = function (id) { return document.getElementById(id); };
    get('cn').onclick = ctx.closeDialog;
    get('mn').focus();
    get('mr').onchange = function () { get('mk').hidden = get('mr').value !== 'Child'; };
    get('fm').onsubmit = function (event) {
      event.preventDefault();
      var errors = [], memberName = get('mn').value.trim();
      var role = self ? 'Self' : get('mr').value, age = +get('ma').value, isChild = role === 'Child';
      if (!memberName || memberName.length > 30) errors.push('Name is required (max 30 characters).');
      if (!(Number.isInteger(age) && age >= 0 && age <= 100)) {
        errors.push('Age must be a whole number from 0 to 100.');
      }
      var classToday = 1, college = 4;
      if (isChild) {
        classToday = +get('mc').value;
        college = +get('mg').value;
        if (!(Number.isInteger(classToday) && classToday >= 1 && classToday <= 12)) {
          errors.push('Class must be 1 to 12.');
        }
        if (!(Number.isInteger(college) && college >= 0 && college <= 8)) {
          errors.push('College duration must be 0 to 8 years.');
        }
      }
      if (errors.length) {
        get('fe').textContent = ctx.translate(errors.join(' '), 1);
        return;
      }
      var member = ctx.makeMember(isNew ? Date.now() : original.id, memberName, role, age, classToday, college);
      if (isNew) state.members.push(member);
      else state.members[index] = member;
      var message = ctx.prepareSave(self);
      ctx.save();
      ctx.closeDialog();
      ctx.render();
      ctx.toast(message || (isNew ? 'Member added' : 'Member updated'));
    };
  }

  function remove(index, ctx) {
    var member = ctx.state.members[index];
    if (!member || index === 0) return;
    ctx.confirm('Remove “' + ctx.escapeName(member.name) + '” from the family?', function () {
      var undo = ctx.undo();
      ctx.state.members.splice(index, 1);
      ctx.save();
      ctx.render();
      ctx.toast('Member removed', undo);
    });
  }

  function setSearch(ui, value) { ui.fq = value; }
  function setFilter(ui, id, value) {
    if (id === 'frf') ui.frl = value;
    else if (id === 'fsf') ui.fk = value;
  }
  function sort(ui, key) {
    ui.fd = ui.fk === key ? -ui.fd : 1;
    ui.fk = key;
  }
  function toggleSort(ui) { ui.fd = -ui.fd; }

  window.VRFamily = {
    page: page,
    rows: rows,
    openEditor: openEditor,
    remove: remove,
    setSearch: setSearch,
    setFilter: setFilter,
    sort: sort,
    toggleSort: toggleSort
  };
})();

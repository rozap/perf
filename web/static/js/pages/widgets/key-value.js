import html from "choo/html";
import _ from "underscore";

function keyvalue(name, items, dispatch, isShowing, toggle) {
  const onCreate = (created) => {
    dispatch(_.extend({}, created, items));
  };

  const onEdit = ({from, to}) => {
    var obj = _.omit(items, from.key);
    obj[to.key] = to.value;
    dispatch(obj);
  };

  const onDelete = (deleted) => {
    dispatch(_.omit(items, deleted));
  };

  const ordered = _.pairs(items).sort(([ak, _av], [bk, _bv]) => {
    return ak.toLowerCase() > bk.toLowerCase()? 1 : -1
  });


  const renderKV = () => {
    if(isShowing) {
      var key = '',
        value = '';
      const onCreateValue = (e) => value = e.target.value;
      const onCreateKey = (e) => key = e.target.value;

      return html`
      <div>
        ${
          ordered.map(([key, value]) => {
            const onEditKey = (e) => {
              onEdit({
                from: {key, value},
                to: {key: e.target.value, value}
              })
            };
            const onEditValue = (e) => {
              onEdit({
                from: {key, value},
                to: {key, value: e.target.value}
              })
            };

            return html`
              <div class="key-value">
                <input
                  name="${key}-name"
                  value="${key}"
                  onchange=${onEditKey}
                />
                <input
                  name="${key}-value"
                  value="${value}"
                  onchange=${onEditValue}
                />
                <a
                  class="pure-button button-warning"
                  onclick=${() => onDelete(key)}>
                  <i class="ion-ios-trash"></i>
                </a>
              </div>
            `;
          })
        }

        <input
          name="new-name"
          onchange=${onCreateKey}
        />
        <input
          name="new-value"
          onchange=${onCreateValue}
        />
        <a href="javascript:void(0)"
          onclick=${() => {
            var obj = {};
            obj[key] = value;
            console.log("CREATED", key, value);
            onCreate(obj);
          }}
          class="pure-button pure-button-primary">
          Add New
        </a>
      </div>
      `
    } else {
      return;
    }
  }

  return html`
    <div>
      <h5>
        <a href="javascript:void(0);"
          onclick=${toggle}>
          <i class="ion-ios-arrow-${isShowing? 'down': 'right'}"></i>
          ${name}
        </a>
      </h5>

      ${renderKV()}
    </div>
  `
}

export default keyvalue;
import html from "choo/html"
import _ from "underscore";

function select(options, onChange, current, attrs) {
  attrs = attrs || {};
  console.log(current);
  return html`<select class="${attrs.class? attrs.class : ''}" onchange=${onChange}>
    ${_.map(options, (value, key) => {
      return html`<option
        ${current === key? 'selected' : '' }
        value="${key}">
        ${value}
      </option>`
    })}
  </select>`;
}

export default select;
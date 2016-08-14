import html from "choo/html"
import _ from "underscore";

function view({error}, name) {
  if(!error.error) return;
  if(!error.error[name]) return;


  const arr = error.error[name];
  const cap = (s) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return html`
    <div class="field-error">
      <ul class="field-errors">
      ${
        arr.map((problem) => {
          return html`<li>${cap(name)}: ${problem}</li>`;
        })
      }
      </ul>
    </div>
  `;
}

export default view;
import html from "choo/html"
import _ from "underscore";

function view({error}, name) {
  console.log("FIELD ERROR", error.error);

  if(!error.error) return;
  const problems = error.error.params.field_errors[name];
  console.log("Problems", problems)
  if(!problems) return;

  const cap = (s) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return html`
    <div class="field-error">
      <ul class="field-errors">
      ${
        problems.map((problem) => {
          return html`<li>${cap(name)}: ${problem}</li>`;
        })
      }
      </ul>
    </div>
  `;
}

export default view;
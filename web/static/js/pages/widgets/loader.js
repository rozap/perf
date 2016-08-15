import html from "choo/html"

function view(text) {
  return html`
    <div class="loading pure-u-1-1">
      <h4 class="text-muted">${text}</h4>
      <div class="loading-anim"></div>
    </div>
  `;
}

export default view;
import html from "choo/html"

function view(collection, onNext, onPrev) {

  const prevButton = () => {
    if(collection.page <= 0) {
      return html`
        <span class="dummy"></span>
      `;
    }

    return html`<a href="javascript:void(0)"
      onclick=${onPrev}
      class="page page-prev">
      <i class="ion-ios-arrow-left"></i>
    </a>`;
  }

  const nextButton = () => {
    if(collection.page >= collection.page_count) return;

    return html`<a href="javascript:void(0)"
      onclick=${onNext}
      class="page page-next">
      <i class="ion-ios-arrow-right"></i>
    </a>`;
  }

  if(collection.page_count === 0) return;

  return html`
    <div class="pager">
      ${prevButton()}
      <span class="pages">${collection.page} / ${collection.page_count}</span>
      ${nextButton()}
    </div>
  `;
}

export default view;
import html from "choo/html"


function clauseView(clause) {
  return html`
    <div class="clause">
      ${clause.toString()}
    </div>
  `
}


function view(query, onClausAdded, onClauseUpdated, onClauseDeleted) {
  return html`
    <div class="query-builder">
      ${query.map((clause) => {
        return clauseView(clause)
      })}
    </div>
  `
}

export default view;
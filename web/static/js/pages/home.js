import choo from "choo"
import html from "choo/html"
import _ from "underscore";
import loader from './widgets/loader';
import error from './widgets/error';
import successView from './widgets/success';
import fieldError from './widgets/field-error';
import menu from './widgets/menu';
import flash from './widgets/flash';


function view(appState, prev, send) {
  return html`
    <div class="app">
    ${menu(appState, send)}
    
    <div class="content explanation">
      <div class="hero">
        <h2>load.fail is the easiest way to load test your web app or API</h2>

        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent malesuada augue eget quam varius, et cursus urna dapibus. 
        </p>

        <p>
          Morbi consectetur libero in risus tempus hendrerit. In fermentum lacus nec nunc fringilla ornare. Aliquam ex erat, dictum a imperdiet sed, tempor at nibh. Suspendisse potenti. Vestibulum vel tortor nec enim egestas accumsan. Donec eu velit est. Vestibulum tempor mi vel pretium congue.
        </p>
      </div>
    </div>
  </div>
  `;
}

export default {view};
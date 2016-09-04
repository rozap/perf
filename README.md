* do the login on startup
* make state refresh on reloading a page

* make yams a genstage

producer -->
  * checkout N processes from Global pool
    * monitor each one
    * tell each one to execute request in a loop
      until X time
    * each request results in send to workex consumer
    * should all report back when they're done



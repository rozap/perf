defmodule Perf.AppController do
  use Perf.Web, :controller

  def index(conn, _params) do
    render conn, "chooapp.html"
  end
end

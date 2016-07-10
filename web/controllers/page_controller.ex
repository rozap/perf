defmodule Perf.PageController do
  use Perf.Web, :controller

  def index(conn, _params) do
    render conn, "index.html"
  end
end

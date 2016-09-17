defmodule Perf.Api.Session do
  alias Perf.{User, Session, Resource}
  alias Perf.Resource.State
  import Perf.Api
  def init(_), do: :ok

  def call(conn, _) do
    %Session{}
    |> Resource.Create.handle(%State{params: conn.params, conn: conn})
    |> to_http
  end

end
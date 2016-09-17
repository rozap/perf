defmodule Perf.Api.User do
  alias Perf.{User, Resource}
  alias Perf.Resource.State
  import Perf.Api

  def init(_), do: :ok

  def call(conn, _) do
    %User{}
    |> Resource.Create.handle(%State{params: conn.params, conn: conn})
    |> to_http
  end

end
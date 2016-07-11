defmodule Perf.Api.Helper do
  alias Perf.Resource.State
  defmacro error(kind, status) do
    quote do
      def to_http(%State{kind: unquote(kind), conn: conn, error: error}) when error != nil do
        send_resp(conn, unquote(status), Poison.encode! error)
      end
    end
  end

  defmacro ok(kind, status) do
    quote do
      def to_http(%State{kind: unquote(kind), conn: conn, resp: resp}) when resp != nil do
        send_resp(conn, unquote(status), Poison.encode! resp)
      end
    end    
  end
end

defmodule Perf.Api do
  alias Perf.Resource.State
  import Plug.Conn
  import Perf.Api.Helper

  error(:bad_request, 400)

  ok(:updated, 202)
  ok(:created, 201)
  ok(:ok, 200)

end
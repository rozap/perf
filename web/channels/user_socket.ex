defmodule Perf.UserSocket do
  use Phoenix.Socket
  import Guardian.Phoenix.Socket
  require Logger

  ## Channels
  channel "api", Perf.ApiChannel
  channel "yams", Perf.YamsChannel

  ## Transports
  transport :websocket, Phoenix.Transports.WebSocket

  def connect(%{"token" => jwt} = params, socket) do
    case sign_in(socket, jwt) do
      {:ok, authed_socket, _guardian_params} ->
        IO.inspect authed_socket.assigns
        {:ok, authed_socket}
      err ->
        Logger.warn("Authorization failed #{inspect err}")
        {:ok, socket}
    end
  end

  def connect(params, socket) do
    IO.puts "Setup socket #{inspect params}"
    {:ok, socket}
  end

  # Socket id's are topics that allow you to identify all sockets for a given user:
  #
  #     def id(socket), do: "users_socket:#{socket.assigns.user_id}"
  #
  # Would allow you to broadcast a "disconnect" event and terminate
  # all active sockets and channels for a given user:
  #
  #     Perf.Endpoint.broadcast("users_socket:" <> user.id, "disconnect", %{})
  #
  # Returning `nil` makes this socket anonymous.
  def id(_socket), do: nil
end

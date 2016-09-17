defmodule Perf.ApiChannel do
  use Phoenix.Channel
  require Logger
  alias Perf.Resource.State
  import Perf.Resource

  @create "create"
  @update "update"
  @delete "delete"
  @read   "read"
  @list   "list"

  @creatable %{
    "suite" => %Perf.Suite{},
    "user" => %Perf.User{},
    "session" => %Perf.Session{},
    "request" => %Perf.Request{},
    "run" => %Perf.Run{}
  }
  @listable %{
    "suite" => %Perf.Suite{},
    "run" => %Perf.Run{}
  }
  @readable %{
    "suite" => %Perf.Suite{},
    "session" => %Perf.Session{},
    "run" => %Perf.Run{}
  }
  @updatable %{
    "suite" => %Perf.Suite{},
    "request" => %Perf.Request{}
  }
  @deletable %{
    "session" => %Perf.Session{},
    "request" => %Perf.Request{}

  }

  @operations [
    {@create, Perf.Resource.Create, quote do: @creatable},
    {@list, Perf.Resource.List,     quote do: @listable},
    {@read, Perf.Resource.Read,     quote do: @readable},
    {@update, Perf.Resource.Update, quote do: @updatable},
    {@delete, Perf.Resource.Delete, quote do: @deletable}
  ]


  def join("api", _, socket) do
    {:ok, socket}
  end

  defp r(%State{resp: nil, socket: socket, error: nil}) do
    {:reply, {:ok, %{}}, socket}
  end
  defp r(%State{resp: resp, socket: socket, error: nil}) do
    {:reply, {:ok, resp}, socket}
  end
  defp r(%State{socket: socket, kind: kind, error: error}) do
    {:reply, {:error, %{kind: kind, error: error}}, socket}
  end


  Enum.each(@operations, fn {verb, protocol, noun} ->
    def handle_in(unquote(verb) <> ":" <> name, params, socket) do
      case Dict.get(unquote(noun), name) do
        nil ->
          Logger.error("Invalid resource #{unquote(verb) <> ":" <> name} #{inspect unquote(noun)}")

          %State{socket: socket}
          |> resource_error(unquote(verb), name)
          |> r
        model ->
          state = %State{params: params, socket: socket}
          res = unquote(protocol).handle(model, state)
          r(res)
      end
    end
  end)


  def handle_info(_, socket) do
    {:noreply, socket}
  end

  def terminate(_reason, _socket) do
    :ok
  end
end
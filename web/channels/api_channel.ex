defmodule Perf.ApiChannel do
  use Phoenix.Channel
  require Logger
  alias Perf.Resource.State

  @create "create"
  @update "update"
  @delete "delete"
  @read   "read"
  @list   "list"

  @creatable %{}
  @listable %{
    "suite" => %Perf.Suite{}
  }
  @readable %{
    "suite" => %Perf.Suite{}
  }
  @updatable %{}
  @deletable %{}

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
    IO.inspect resp
    {:reply, {:ok, resp}, socket}
  end
  defp r(%State{socket: socket, error: reason}) do
    {:reply, {:error, reason}, socket}
  end


  Enum.each(@operations, fn {verb, protocol, noun} ->
    def handle_in(unquote(verb) <> ":" <> name, params, socket) do
      case Dict.get(unquote(noun), name) do
        nil ->
          Logger.error("Invalid resource #{unquote(verb) <> ":" <> name} #{inspect unquote(noun)}")
          %State{error: %{message: "invalid_resource"}, socket: socket}
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
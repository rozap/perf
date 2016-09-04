defmodule Perf.YamsChannel do
  use Phoenix.Channel
  require Logger
  alias Perf.Resource.State
  alias Perf.Yams.Handle
  import Perf.Resource


  def join("yams", %{"yam_ref" => yam_ref}, socket) do
    {_, handle} = Handle.open(yam_ref)

    Logger.warn("Channel yam #{inspect handle}")
    socket = assign(socket, :handle, handle)
    {:ok, socket}
  end

  def handle_in("change:events", _, socket) do
    res = case Handle.subscribe_changes(socket.assigns.handle) do
      :ok -> {:ok, %{}}
      err ->
        Logger.error("Failed to subscribe to yam changes #{inspect err}")
        {:error, %{error: "failed to subscribe"}}
    end

    {:reply, res, socket}
  end

  def handle_in("list:events", %{"start_t" => start_t, "end_t" => end_t}, socket) do
    Handle.stream!(socket.assigns.handle, {start_t, end_t})
    |> Enum.into([])
    |> IO.inspect
    {:reply, {:ok, %{}}, socket}
  end

  def handle_info({:change, {_key, event}, {:from, pid}}, %{assigns: %{handle: pid}} = socket) do
    push socket, "change:events", event
    {:noreply, socket}
  end

  def handle_info(_, socket) do
    {:noreply, socket}
  end

  def terminate(_reason, _socket) do
    :ok
  end
end
defmodule Perf.YamsChannel do
  use Phoenix.Channel
  require Logger
  alias Phoenix.Socket
  alias Perf.Resource.State
  alias Perf.Yams.{Handle, Query}
  alias Perf.{Repo, Run, Yams, Request}
  alias Perf.Runner.Events.{Success, Error, StartingRequest, Done}
  import Perf.Resource


  def join("yams", %{"run_id" => run_id}, socket) do
    case Repo.get(Run, run_id) do
      %Run{} = run ->
        {_, handle} = Handle.open(run.yam_ref)

        socket = socket
        |> assign(:run, run)
        |> assign(:event_buf, [])
        |> assign(:handle, handle)

        Logger.info("Started yams channel for #{inspect run}")

        {:ok, socket}
      error ->
        Logger.warn("Failed to join yam #{inspect error}")
        {:error, socket}
    end
  end



  # def handle_in("change:events", _, socket) do
  #   streamer = spawn_link(fn ->
  #     run = socket.assigns.run

  #     Handle.changes(socket.assigns.handle)
  #     |> aggregate(run)
  #     |> Stream.each(fn measures ->
  #       push socket, "change:events", %{events: group_into_measures(measures)}
  #     end)
  #     |> Stream.run
  #   end)

  #   socket = assign(socket, :streamer, streamer)

  #   {:reply, {:ok, %{}}, socket}
  # end

  def handle_in("query:events", %{
      "start_t_seconds" => start_t_seconds,
      "end_t_seconds" => end_t_seconds,
      "query" => query}, socket) do
    start_t = Yams.seconds_to_key(start_t_seconds)
    end_t = Yams.seconds_to_key(end_t_seconds)

    run = socket.assigns.run

    events = socket.assigns.handle
    |> Handle.stream!({start_t, end_t})
    |> Query.as_stream!
    |> Enum.into([])
    |> IO.inspect

    events = []
    {:reply, {:ok, %{events: events}}, socket}
  end

  def handle_in(_, _, socket) do
    {:reply, {:ok, %{}}, socket}
  end

  def handle_info(_, socket) do
    {:noreply, socket}
  end

  def terminate(_reason, _socket) do
    :ok
  end
end
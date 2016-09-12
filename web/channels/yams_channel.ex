defmodule Perf.YamsChannel do
  use Phoenix.Channel
  require Logger
  alias Phoenix.Socket
  alias Perf.Resource.State
  alias Perf.Yams.{Handle}
  alias Perf.{Repo, Run, Yams, Request}
  alias Perf.Runner.Events.{Success, Error, StartingRequest, Done}
  import Perf.Resource


  def join("yams", %{"run_id" => run_id}, socket) do
    case Repo.get(Run, run_id) do
      %Run{} = run ->
        case Handle.open(run.yam_ref) do
          {:error, reason} ->
            Logger.warn("Failed to join yam, yam handle error #{inspect reason}")
            {:error, socket}
          {_, handle} ->
            socket = socket
            |> assign(:run, run)
            |> assign(:event_buf, [])
            |> assign(:handle, handle)

            Logger.info("Started yams channel for #{inspect run}")

            {:ok, socket}
        end
      error ->
        Logger.warn("Failed to join yam #{inspect error}")
        {:error, socket}
    end
  end



  def handle_in("change:events", %{"query" => query}, socket) do
    streamer = spawn_link(fn ->
      run = socket.assigns.run

      changes = socket.assigns.handle
      |>Handle.changes
      |> Yams.Interpreter.run(query)

      case changes do
        {:ok, stream} -> 
          stream
          |> Yams.Query.as_stream!
          |> Stream.each(fn events ->
            push socket, "change:events", %{events: [events]}
          end)
          |> Stream.run
        {:error, other} ->
          Logger.warn("Failed to run change stream on #{inspect query}")

      end

    end)

    socket = assign(socket, :streamer, streamer)

    {:reply, {:ok, %{}}, socket}
  end

  def handle_in("query:events", %{
      "start_t_seconds" => start_t_seconds,
      "end_t_seconds" => end_t_seconds,
      "query" => query}, socket) do
    start_t = Yams.seconds_to_key(start_t_seconds)
    end_t = Yams.seconds_to_key(end_t_seconds)

    run = socket.assigns.run

    case socket.assigns.handle
    |> Handle.stream!({start_t, end_t})
    |> Yams.Interpreter.run(query) do
      {:ok, stream} ->

        {:ok, quoted} = Yams.Interpreter.compile(query)
        Logger.info("Ran query #{Macro.to_string(quoted)}")

        events = stream
        |> Yams.Query.as_stream!
        |> Enum.into([])

        {:reply, {:ok, %{events: events}}, socket}
      {:error, reason} ->
        with {:ok, quoted} <- Yams.Interpreter.compile(query) do
          Logger.warn("Failed on #{Macro.to_string(quoted)}")
        end

        {:reply, {:error, %{kind: :bad_request, reason: reason}}, socket}
    end
  end

  def handle_in(message, params, socket) do
    Logger.warn("Got bad request #{message} #{inspect params}")
    {:reply, {:error, %{kind: :bad_request}}, socket}
  end

  def handle_info(_, socket) do
    {:noreply, socket}
  end

  def terminate(_reason, _socket) do
    :ok
  end
end
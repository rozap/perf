defmodule Perf.Runner.RequestWorker do
  use GenServer
  alias Perf.Request
  alias Perf.Yams
  require Logger
  alias Perf.Runner.Events.{Success, Error}
  alias Perf.Runner.{Producer, Consumer}

  @methods ["GET", "POST", "PUT", "PATCH", "DELETE"]

  def start_link(_) do
    GenServer.start_link(__MODULE__, [])
  end

  def init(_) do
    {:ok, %{request: :none, until: :none, consumer: :none, producer: :none}}
  end

  defp request(method, request) do
    HTTPoison.request(method, request.path, "", [], [
      timeout: request.timeout,
      recv_timeout: request.receive_timeout
    ])
  end

  defp now do
    {Yams.key, Yams.key}
  end

  defp time(func) do
    start_t = Yams.key
    result = func.()
    end_t = Yams.key

    {result, {start_t, end_t}}
  end

  Enum.each(@methods, fn method ->
    defp method_from_request(unquote(method)) do
      {:ok, String.downcase(unquote(method)) |> String.to_atom}
    end
  end)
  defp method_from_request(unknown) do
    {:error, %{key: :invalid_method, params: %{method: unknown}}}
  end

  defp make_request(%Request{} = r) do
    case method_from_request(r.method) do
      {:ok, method} ->
        # Logger.debug("Making a request #{method} #{r.path}")
        {result, range} = time fn -> request(method, r) end
        {result, range}
      err ->
        {err, now()}
    end
  end

  defp to_result(request, {{:error, %HTTPoison.Error{reason: reason}}, range}) do
    {start_t, end_t} = range

    %Error{
      start_t: start_t,
      end_t: end_t,
      reason: %{
        key: :request_failed,
        params: %{
          reason: reason
        }
      },
      request: request
    }
  end

  defp to_result(request, {{:error, error}, {start_t, end_t}}) do
    %Error{
      start_t: start_t,
      end_t: end_t,
      reason: error,
      request: request
    }
  end

  defp to_result(request, {{:ok, response}, {start_t, end_t}}) do
    %HTTPoison.Response{body: body, status_code: status} = response
    size = byte_size(body)

    %Success{
      size: size,
      start_t: start_t,
      end_t: end_t,
      status: status,
      request: request
    }
  end


  def handle_info({:DOWN, ref, :process, pid, _reason}, %{producer: {pid, _ref}} = state) do
    {:noreply, %{state | producer: :none}}
  end

  def handle_info({:DOWN, ref, :process, pid, _reason}, %{consumer: {pid, _ref}} = state) do
    {:noreply, %{state | consumer: :none}}
  end

  def handle_cast(:schedule, %{request: :none}) do
    Logger.error("Cannot schedule request when it's none!")
    {:stop, :no_request}
  end
  def handle_cast(:schedule, %{until: :none}) do
    Logger.error("Cannot schedule request when until is none!")
    {:stop, :no_until}
  end
  def handle_cast(:schedule, %{consumer: :none}) do
    Logger.error("Cannot schedule request when consumer is none!")
    {:stop, :no_consumer}
  end
  def handle_cast(:schedule, %{producer: :none}) do
    Logger.error("Cannot schedule request when producer is none!")
    {:stop, :no_producer}
  end


  def handle_cast(:schedule, %{request: request, until: until} = state) do
    if Yams.key > until do
      {producer_pid, _} = state.producer
      Producer.on_complete(producer_pid)

      {_, c_ref} = state.consumer
      Process.demonitor(c_ref)
      {:noreply, %{state | request: :none, until: :none, consumer: :none}}
    else
      result = to_result(request, make_request(request))

      {c_pid, _} = state.consumer
      Consumer.on_event(c_pid, result)

      schedule(self)
      {:noreply, state}
    end

  end

  def handle_cast({:work_on, request, until, consumer_pid, producer_pid}, state) do
    consumer = {consumer_pid, Process.monitor(consumer_pid)}
    producer = {producer_pid, Process.monitor(producer_pid)}
    schedule(self)
    {:noreply, %{state |
      request: request,
      until: until,
      consumer: consumer,
      producer: producer
    }}
  end

  defp schedule(pid) do
    GenServer.cast(pid, :schedule)
  end

  def work_on(pid, request, until, consumer) do
    GenServer.cast(pid, {:work_on, request, until, consumer, self})
  end

end
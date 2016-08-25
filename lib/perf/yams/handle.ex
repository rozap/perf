defmodule Perf.Yams.Handle do
  use GenServer

  def init([key: key]) do
    {:ok, ref} = Application.get_env(:perf, :yams)[:space]
    |> Path.join(key)
    |> :binary.bin_to_list
    |> :eleveldb.open([create_if_missing: true])

    {:ok, %{
      db: ref,
      subscribers: []
    }}
  end

  # def handle_call({:put, many}, _, state) when is_list(many) do

  # end

  def handle_call({:put, {key, value}}, _, state) do
    serialized = :erlang.term_to_binary(value)
    result = :eleveldb.put(state.db, "#{key}", serialized, [])

    Enum.each(state.subscribers, fn who ->
      send who, {:change, {key, value}, {:from, self}}
    end)

    {:reply, result, state}
  end

  def handle_call({:stream, start_time, end_time}, _, state) do
    stream = Stream.resource(
      fn ->
        {:ok, ref} = :eleveldb.iterator(state.db, [])
        {:first, ref}
      end,
      fn {state, ref} ->
        case :eleveldb.iterator_move(ref, state) do
          {:ok, key, bin} ->
            value = :erlang.binary_to_term(bin)
            {[{key, value}], {:next, ref}}
          {:error, err} ->
            {:halt, {:done, ref}}
        end
      end,
      fn {_, ref} -> :eleveldb.iterator_close(ref) end
    )

    {:reply, stream, state}
  end

  def handle_call({:changes, who}, _, state) do
    Process.monitor(who)
    {:reply, :ok, Map.put(state, :subscribers, [who | state.subscribers])}
  end

  def handle_call(:listeners, _, state) do
    {:reply, {:ok, length(state.subscribers)}, state}
  end

  def handle_info({:DOWN, ref, :process, who, _reason}, state) do
    subs = Enum.reject(state.subscribers, fn s -> s == who end)
    {:noreply, Map.put(state, :subscribers, subs)}
  end

  def stream!(pid, start_time, end_time) do
    GenServer.call(pid, {:stream, start_time, end_time})
  end

  def put(pid, key, value) do
    GenServer.call(pid, {:put, {key, value}})
  end

  def listeners(pid) do
    GenServer.call(pid, :listeners)
  end

  def changes(pid) do
    Stream.resource(
      fn ->
        GenServer.call(pid, {:changes, self})
      end,
      fn state ->
        receive do
          {:change, row, {:from, ^pid}} -> {[row], state}
          :done -> {:halt, state}
        end
      end,
      fn _ -> :ok end
    )
  end

  def open(key) do
    name = String.to_atom("yams_handler_#{key}")

    case GenServer.start(__MODULE__, [key: key], [name: name]) do
      {:error, {:already_started, pid}} -> {:existing, pid}
      {:ok, pid}                        -> {:created, pid}
      err                               -> err
    end
  end
end
defmodule YamsTest do
  use ExUnit.Case
  alias Perf.Yams

  setup do
    Yams.start_link
    :ok
  end

  test "can put and get" do
    from_ts = Yams.key

    {:created, h} = Yams.Handle.open(UUID.uuid1())

    :ok = Yams.Handle.put(h, Yams.key, [:a, :b, :c])
    :ok = Yams.Handle.put(h, Yams.key, [:d, :e, :f])
    :ok = Yams.Handle.put(h, Yams.key, [:g, :h, :i])

    to_ts = Yams.key

    values = Yams.Handle.stream!(h, from_ts, to_ts)
    |> Stream.map(fn {key, value} -> value end)
    |> Enum.into([])
    
    assert values == [
      [:a, :b, :c], 
      [:d, :e, :f], 
      [:g, :h, :i]
    ]
  end

  test "can get a changes stream, put to it and get rows" do

    ref = UUID.uuid1()

    task = Task.async(fn ->
      {_, pid} = Yams.Handle.open(ref)
      Yams.Handle.changes(pid)
      |> Stream.map(fn {key, value} -> value end)
      |> Enum.into([])
    end)

    {_, h} = Yams.Handle.open(ref)
    
    from_ts = Yams.key
    :ok = Yams.Handle.put(h, Yams.key, [:a, :b, :c])
    :ok = Yams.Handle.put(h, Yams.key, [:d, :e, :f])
    :ok = Yams.Handle.put(h, Yams.key, [:g, :h, :i])
    to_ts = Yams.key


    send task.pid, :done    
    changes = Task.await(task)

    assert changes == [
      [:a, :b, :c], 
      [:d, :e, :f], 
      [:g, :h, :i]
    ]

    values = Yams.Handle.stream!(h, from_ts, to_ts)
    |> Stream.map(fn {key, value} -> value end)
    |> Enum.into([])

    assert values == changes
  end

  test "can get a shut down a changes stream" do

    ref = UUID.uuid1()

    task = Task.async(fn ->
      {_, pid} = Yams.Handle.open(ref)
      Yams.Handle.changes(pid)
      |> Stream.map(fn {key, value} -> value end)
      |> Enum.into([])
    end)

    {_, h} = Yams.Handle.open(ref)

    assert Yams.Handle.listeners(h) == {:ok, 1}

    send task.pid, :done    
    changes = Task.await(task)

    
    from_ts = Yams.key
    :ok = Yams.Handle.put(h, Yams.key, [:a, :b, :c])
    :ok = Yams.Handle.put(h, Yams.key, [:d, :e, :f])
    :ok = Yams.Handle.put(h, Yams.key, [:g, :h, :i])
    to_ts = Yams.key

    assert Yams.Handle.listeners(h) == {:ok, 0}
  end
end
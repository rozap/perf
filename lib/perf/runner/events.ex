defmodule Perf.Runner.Events do
  defmodule Result do
    defstruct size: 0,
      start_t: 0,
      end_t: 0,
      success: false,
      status: :none,
      request: :none,
      reason: :none
  end

  defmodule Success do
    defstruct latency: 0,
      at: 0,
      throughput: 0,
      status: :none
  end

  defmodule Error do
    defstruct reason: :none,
      status: :none,
      at: 0
  end

  defmodule StartingRequest do
    defstruct at: 0,
      request: :none,
      ref: :none
  end

  defmodule Done do
    defstruct at: 0,
      ref: :none
  end

end